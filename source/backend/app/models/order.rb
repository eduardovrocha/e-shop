class Order < ApplicationRecord
  # Rótulos amigáveis para erros vindos do AR — "Tax id ..." vira "CPF/CNPJ".
  # Resto cai no default (`humanize`). Mantém os full_messages legíveis nos
  # contratos antigos que ainda renderizam `error: msg`.
  def self.human_attribute_name(attr, options = {})
    return "CPF/CNPJ" if attr.to_s == "tax_id"
    super
  end

  STATUSES = %w[
    pending paid failed disputed cancelled
    processing ready_to_ship producing packed shipped out_for_delivery delivered refunded
  ].freeze

  # Statuses that derive from aggregated per-item production state. The
  # refresh_aggregate_status! method only transitions BETWEEN derived states
  # — it never overwrites terminal/non-derived statuses like refunded.
  AGGREGATE_DERIVED_STATUSES = %w[paid processing ready_to_ship shipped delivered cancelled].freeze
  AGGREGATE_PRESERVED_STATUSES = %w[refunded disputed failed].freeze

  VALID_TRANSITIONS = {
    "pending"          => %w[paid failed cancelled],
    "paid"             => %w[processing ready_to_ship cancelled refunded disputed],
    "processing"       => %w[producing ready_to_ship packed shipped cancelled],
    "ready_to_ship"    => %w[shipped packed cancelled],
    "producing"        => %w[ready_to_ship packed cancelled],
    "packed"           => %w[shipped cancelled],
    "shipped"          => %w[out_for_delivery delivered],
    "out_for_delivery" => %w[delivered failed],
    "delivered"        => %w[refunded disputed],
    "failed"           => %w[pending cancelled],
    "disputed"         => %w[refunded cancelled],
    "cancelled"        => %w[],
    "refunded"         => %w[]
  }.freeze

  DELIVERY_METHODS = %w[delivery pickup].freeze

  # Origem do pedido. web = checkout do site (Stripe); manual = registrado
  # pelo admin para vendas fechadas fora do site (WhatsApp/Instagram/balcão).
  enum :source, { web: 0, manual: 1 }, default: :web

  # Forma de pagamento externa de pedidos manuais (o pagamento já ocorreu
  # fora do Stripe). nil para pedidos do site.
  enum :external_payment_method, { pix: 0, transferencia: 1, cartao: 2, dinheiro: 3 }, prefix: :payment

  # Modo de envio do pedido.
  enum :shipping_mode, { melhor_envio: 0, manual: 1, retirada: 2 }, prefix: :shipping

  # CPF (11 dígitos) ou CNPJ (14 dígitos). Armazenado sempre cru (sem máscara).
  # Pedidos legados anteriores à migration podem ter `tax_id` nil — daí a
  # obrigatoriedade ser `on: :create`. tax_id_kind é derivado do tamanho
  # do número e ressetado no `before_validation`.
  enum :tax_id_kind, { cpf: 0, cnpj: 1 }, prefix: :tax_id

  has_many :status_histories, class_name: "OrderStatusHistory",
                               dependent: :destroy, inverse_of: :order
  has_many :order_items, dependent: :destroy
  belongs_to :customer, optional: true
  belongs_to :created_by_admin, class_name: "User", optional: true

  # Coupon snapshot — the discount_* columns are the source of truth for the
  # historical record. The FK to coupon is informational; the coupon may be
  # edited or even deleted later (when its last usage row is removed) and
  # this order's discount values remain frozen.
  belongs_to :coupon, optional: true
  has_one :coupon_usage, dependent: :destroy

  # Pedidos do site exigem o PaymentIntent do Stripe; pedidos manuais não têm
  # intent. A unicidade vale sempre que houver valor (allow_nil).
  validates :stripe_intent_id, presence: true, if: :web?
  validates :stripe_intent_id, uniqueness: { allow_nil: true }
  validates :status,            inclusion: { in: STATUSES }
  validates :delivery_method,   inclusion: { in: DELIVERY_METHODS }
  validates :tracking_token,    presence: true, uniqueness: true
  validates :items_total_cents, :shipping_fee_cents, :total_cents,
            numericality: { greater_than_or_equal_to: 0 }

  # CPF/CNPJ — obrigatório apenas na criação para não invalidar pedidos
  # legados que existem em produção sem o campo. Validações de formato e
  # dígito verificador rodam apenas quando o valor muda, então update de
  # pedido legado SEM tocar em tax_id continua passando. tax_id_kind é
  # derivado de tax_id no callback; não tem validação própria porque o
  # erro útil ao usuário sempre se refere ao tax_id em si.
  validates :tax_id, presence: { message: "Informe CPF ou CNPJ" }, on: :create
  validates :tax_id, format: { with: /\A(\d{11}|\d{14})\z/, message: "deve ter 11 (CPF) ou 14 (CNPJ) dígitos" },
                     if:     :tax_id_changed?
  validate :tax_id_checksum_valid, if: :tax_id_changed?

  before_validation :ensure_tracking_token
  before_validation :normalize_tax_id
  before_validation :infer_tax_id_kind
  after_create      :assign_number

  scope :paid,    -> { where(status: "paid") }
  scope :pending, -> { where(status: "pending") }

  def paid?
    status == "paid"
  end

  def total_brl
    total_cents / 100.0
  end

  # Display-friendly card brand labels for the payment summary line.
  # Stripe returns lowercase tokens (visa, mastercard, amex …) — we map
  # the ones we expect and titleize anything else as a safe fallback.
  CARD_BRAND_LABELS = {
    "visa"             => "Visa",
    "mastercard"       => "Mastercard",
    "amex"             => "American Express",
    "elo"              => "Elo",
    "hipercard"        => "Hipercard",
    "diners"           => "Diners",
    "discover"         => "Discover",
    "jcb"              => "JCB",
    "unionpay"         => "UnionPay"
  }.freeze

  # Human-readable payment summary for receipts/emails. Combines the
  # captured card method (brand + last4) with the installment plan into a
  # single line: "Visa •••• 1234 · 3x de R$ 50,00 sem juros". Falls back
  # gracefully when fields are missing so legacy orders still render.
  def payment_summary
    [ card_label, installment_label ].compact.join(" · ")
  end

  def public_tracking_url
    host = ENV.fetch("FRONTEND_URL", "http://localhost").sub(/\/$/, "")
    "#{host}/track/#{tracking_token}"
  end

  # Formato para exibição (admin, email, recibo). Nunca usar `tax_id` direto
  # nas views — sempre passar por aqui para receber a máscara correta. Retorna
  # nil se o pedido não tiver documento (pedido legado).
  def tax_id_formatted
    return nil if tax_id.blank?
    case tax_id.length
    when 11 then tax_id.gsub(/\A(\d{3})(\d{3})(\d{3})(\d{2})\z/, '\1.\2.\3-\4')
    when 14 then tax_id.gsub(/\A(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})\z/, '\1.\2.\3/\4-\5')
    else         tax_id
    end
  end

  # Recomputes the order's status from the production_status of its items.
  # Called by OrderItem after each item transition. Terminal/non-derived
  # statuses (refunded, disputed, failed) are preserved — those are owned by
  # other flows (disputes, manual refund) and must not be overwritten here.
  def refresh_aggregate_status!
    return if AGGREGATE_PRESERVED_STATUSES.include?(status)

    active = order_items.where.not(production_status: :canceled)
    all_items = order_items.count

    # All items canceled → cancel the order.
    if active.empty? && all_items.positive? && status != "cancelled"
      transition_aggregate_to("cancelled")
      return
    end

    # pluck on an enum column returns the string key in Rails 7.2.
    item_statuses = active.pluck(:production_status)
    return if item_statuses.empty?

    target =
      if item_statuses.all? { |s| s == "delivered" }
        "delivered"
      elsif item_statuses.all? { |s| %w[shipped delivered].include?(s) }
        "shipped"
      elsif item_statuses.all? { |s| %w[ready_to_ship shipped delivered].include?(s) }
        "ready_to_ship"
      elsif item_statuses.any? { |s| s == "in_production" }
        "processing"
      elsif item_statuses.all? { |s| %w[paid ready_to_ship in_production].include?(s) }
        "paid"
      end

    return if target.nil? || status == target

    transition_aggregate_to(target)
  end

  private

  def card_label
    brand = CARD_BRAND_LABELS[payment_brand.to_s.downcase] || payment_brand.to_s.titleize.presence
    last4 = payment_last4.presence
    return nil if brand.blank? && last4.blank?
    return "Cartão •••• #{last4}" if brand.blank?
    return brand if last4.blank?
    "#{brand} •••• #{last4}"
  end

  def installment_label
    count = installment_count.to_i
    if count >= 2
      per_cents = (total_cents.to_f / count).round
      "#{count}x de R$ #{format('%.2f', per_cents / 100.0).tr('.', ',')} sem juros"
    else
      "à vista"
    end
  end

  # Transitions via OrderStatusService when the move is legal under the
  # configured VALID_TRANSITIONS. The service handles history + notifications.
  # We do not force-override: if the transition is forbidden from the current
  # status (e.g. order is already in a manual workflow), we leave it alone.
  def transition_aggregate_to(target)
    allowed = VALID_TRANSITIONS.fetch(status, [])
    return unless allowed.include?(target)

    OrderStatusService.transition(self, target, admin: "production-aggregate")
  end

  def ensure_tracking_token
    return if tracking_token.present?
    self.tracking_token = loop do
      token = SecureRandom.urlsafe_base64(16)
      break token unless Order.exists?(tracking_token: token)
    end
  end

  # Strip de máscara e qualquer caractere não-numérico. Aceita o campo
  # chegando do payload como "111.444.777-35", "11.222.333/0001-81", " 111…",
  # etc. Resultado: só dígitos. Blank in → blank out (não força "").
  def normalize_tax_id
    return if tax_id.nil?
    cleaned = tax_id.to_s.gsub(/\D/, "")
    self.tax_id = cleaned.presence
  end

  # Define kind a partir do tamanho do documento normalizado. Tamanhos
  # inválidos zeram o kind para que a validação de formato/presença
  # acuse o erro real (não o "kind inválido").
  def infer_tax_id_kind
    self.tax_id_kind =
      case tax_id.to_s.length
      when 11 then :cpf
      when 14 then :cnpj
      else         nil
      end
  end

  def tax_id_checksum_valid
    return if tax_id.blank?
    return if TaxIdChecksum.valid?(tax_id)
    label = tax_id.length == 14 ? "CNPJ" : "CPF"
    errors.add(:tax_id, "#{label} inválido")
  end

  def assign_number
    update_column(:number, "AND-#{id.to_s.rjust(6, '0')}")
  end
end

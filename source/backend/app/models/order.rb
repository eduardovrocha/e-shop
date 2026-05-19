class Order < ApplicationRecord
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

  has_many :status_histories, class_name: "OrderStatusHistory",
                               dependent: :destroy, inverse_of: :order
  has_many :order_items, dependent: :destroy

  validates :stripe_intent_id,  presence: true, uniqueness: true
  validates :status,            inclusion: { in: STATUSES }
  validates :delivery_method,   inclusion: { in: DELIVERY_METHODS }
  validates :tracking_token,    presence: true, uniqueness: true
  validates :items_total_cents, :shipping_fee_cents, :total_cents,
            numericality: { greater_than_or_equal_to: 0 }

  before_validation :ensure_tracking_token
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
    [card_label, installment_label].compact.join(" · ")
  end

  def public_tracking_url
    host = ENV.fetch("FRONTEND_URL", "http://localhost").sub(/\/$/, "")
    "#{host}/track/#{tracking_token}"
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

  def assign_number
    update_column(:number, "AND-#{id.to_s.rjust(6, '0')}")
  end
end

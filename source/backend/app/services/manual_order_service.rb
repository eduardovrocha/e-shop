# Registra uma venda fechada fora do site (WhatsApp/Instagram/balcão) como um
# Order de primeira classe, no MESMO fluxo de vendas do site.
#
# Premissas: nasce pago (sem Stripe), preço unitário vem do formulário (ajuste
# livre por item), e estoque/produção são tratados pelo MESMO ponto do site
# (OrderFulfillmentService) — nada de pipeline paralelo. Tudo transacional:
# falha em qualquer etapa = rollback total.
class ManualOrderService
  Result = Struct.new(:ok, :order, :error, keyword_init: true) do
    def ok? = ok
  end

  class ValidationError < StandardError; end

  def self.call(params, admin:)
    new(params, admin: admin).call
  end

  def initialize(params, admin:)
    @params = params.to_h.symbolize_keys
    @admin  = admin
  end

  def call
    order = nil
    ActiveRecord::Base.transaction do
      validate!
      order = build_and_persist_order!
      fulfill!(order)
      record_audit!(order)
    end

    # Efeitos pós-commit (não devem derrubar a criação do pedido).
    CustomerUpsertService.call(order)
    OrderBroadcastService.call(order)
    enqueue_paid_email(order)

    Result.new(ok: true, order: order.reload)
  rescue ValidationError => e
    Result.new(ok: false, error: e.message)
  end

  private

  attr_reader :params, :admin

  # ── Validação ──────────────────────────────────────────────────────────────
  def validate!
    raise ValidationError, "Adicione ao menos um item ao pedido." if line_items.empty?

    customer = params[:customer].to_h.symbolize_keys
    if customer[:name].to_s.strip.blank? ||
       (customer[:email].to_s.strip.blank? && customer[:phone].to_s.strip.blank?)
      raise ValidationError, "Informe o nome e ao menos um contato (email ou telefone) do cliente."
    end

    unless Order.shipping_modes.key?(shipping_mode)
      raise ValidationError, "Modo de envio inválido."
    end

    if shipping_mode != "retirada" && shipping_address.blank?
      raise ValidationError, "Informe o endereço de entrega para este modo de envio."
    end

    raise ValidationError, "O total do pedido não pode ser negativo." if total_cents.negative?
  end

  # ── Persistência ─────────────────────────────────────────────────────────--
  def build_and_persist_order!
    customer = params[:customer].to_h.symbolize_keys

    Order.create!(
      source:                     :manual,
      status:                     "paid",
      stripe_intent_id:           nil,
      external_payment_method:    params[:external_payment_method],
      paid_at:                    parsed_paid_at,
      created_by_admin:           admin,
      customer_name:              customer[:name],
      customer_email:             customer[:email].presence,
      customer_phone:             customer[:phone].presence,
      delivery_method:            shipping_mode == "retirada" ? "pickup" : "delivery",
      shipping_mode:              shipping_mode,
      shipping_address:           shipping_address,
      manual_shipping_cost_cents: shipping_mode == "manual" ? shipping_fee_cents : nil,
      carrier:                    params[:carrier].presence,
      shipping_service:           params[:shipping_service].presence,
      manual_discount_cents:      manual_discount_cents,
      items_total_cents:          items_total_cents,
      shipping_fee_cents:         shipping_fee_cents,
      total_cents:                total_cents,
      items:                      items_snapshot,
      notes:                      params[:notes].presence
    )
  end

  # Reaproveita o ÚNICO ponto do site para deduzir estoque, materializar os
  # OrderItem e dirigir a máquina de estados (skip-to-ready para from_stock,
  # avanço da fila para made_to_order).
  def fulfill!(order)
    OrderFulfillmentService.deduct_stock!(items_snapshot)
    OrderFulfillmentService.create_order_items_for!(order, items_snapshot, promised_snapshot)
    OrderFulfillmentService.activate_items!(order)
  end

  def record_audit!(order)
    OrderStatusHistory.create!(
      order:       order,
      status:      "paid",
      title:       OrderStatusHistory.title_for("paid"),
      description: "Pedido manual (#{params[:external_payment_method]}) registrado por #{admin&.email}.",
      metadata:    {
        "source"                  => "manual",
        "external_payment_method" => params[:external_payment_method],
        "created_by_admin_id"     => admin&.id
      },
      created_by:  admin&.email
    )
  end

  def enqueue_paid_email(order)
    OrderStatusEmailJob.perform_later(order.id, "paid") if order.customer_email.present?
  end

  # ── Cálculo e snapshots ────────────────────────────────────────────────────
  # Resolve cada linha do formulário para a variante real. unit_price_cents vem
  # do formulário (ajuste livre por item); name/size vêm da variante.
  def line_items
    @line_items ||= Array(params[:items]).filter_map do |raw|
      item       = raw.to_h.symbolize_keys
      variant_id = item[:variant_id].to_i
      variant    = ProductVariant.find_by(id: variant_id)
      next if variant.nil?

      quantity         = [ item[:quantity].to_i, 1 ].max
      unit_price_cents = item[:unit_price_cents].to_i
      { variant: variant, quantity: quantity, unit_price_cents: unit_price_cents }
    end
  end

  def items_snapshot
    @items_snapshot ||= line_items.map do |li|
      variant = li[:variant]
      {
        "id"               => variant.id,
        "variant_id"       => variant.id,
        "name"             => variant.product&.name,
        "size"             => variant.size,
        "quantity"         => li[:quantity],
        "unit_price_cents" => li[:unit_price_cents],
        "subtotal_cents"   => li[:unit_price_cents] * li[:quantity]
      }
    end
  end

  # Prazo de produção por variante made_to_order, no formato consumido pelo
  # OrderFulfillmentService.create_order_items_for!.
  def promised_snapshot
    line_items.filter_map do |li|
      product = li[:variant].product
      next unless product&.made_to_order?
      { "variant_id" => li[:variant].id, "promised_completion_days" => product.production_lead_time_days.to_i }
    end
  end

  def items_total_cents
    items_snapshot.sum { |i| i["subtotal_cents"] }
  end

  def shipping_fee_cents
    case shipping_mode
    when "retirada" then 0
    when "manual"   then params[:manual_shipping_cost_cents].to_i
    else                 params[:shipping_fee_cents].to_i
    end
  end

  def manual_discount_cents
    params[:manual_discount_cents].to_i
  end

  def total_cents
    items_total_cents + shipping_fee_cents - manual_discount_cents
  end

  def shipping_mode
    @shipping_mode ||= params[:shipping_mode].to_s
  end

  def shipping_address
    addr = params[:shipping_address]
    return nil if addr.blank?
    addr.respond_to?(:to_h) ? addr.to_h.stringify_keys : addr
  end

  def parsed_paid_at
    raw = params[:paid_at]
    return Time.current if raw.blank?
    Time.zone.parse(raw.to_s) || Time.current
  rescue ArgumentError, TypeError
    Time.current
  end
end

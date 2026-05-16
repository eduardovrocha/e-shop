class ProductionMailer < ApplicationMailer
  layout false

  # Tells the customer that production of their item started.
  def item_entered_production(order_item_id)
    @order_item = OrderItem.find(order_item_id)
    @order      = @order_item.order
    @product    = @order_item.product_variant&.product
    @store_name = StoreSetting.instance.event_name.presence || "Andrequicé"
    @public_url = @order.public_tracking_url
    @promised   = @order_item.promised_completion_date

    return unless @order.customer_email.present?

    mail(
      to:      @order.customer_email,
      from:    sender,
      subject: "Sua peça entrou em produção — Pedido #{@order.number}"
    )
  end

  # Tells the customer that an item is ready (made_to_order only).
  # Different subject depending on whether this is the last pending item.
  def item_ready(order_item_id)
    @order_item = OrderItem.find(order_item_id)
    @order      = @order_item.order
    @product    = @order_item.product_variant&.product
    @store_name = StoreSetting.instance.event_name.presence || "Andrequicé"
    @public_url = @order.public_tracking_url

    pending_states = OrderItem.production_statuses.values_at(
      :pending, :paid, :in_production
    )
    @last_item_pending = @order.order_items
                               .where.not(id: @order_item.id)
                               .where(production_status: pending_states)
                               .none?

    return unless @order.customer_email.present?

    subject =
      if @last_item_pending
        "Seu pedido está pronto para envio — Pedido #{@order.number}"
      else
        "Uma peça do seu pedido está pronta — Pedido #{@order.number}"
      end

    mail(to: @order.customer_email, from: sender, subject: subject)
  end

  # Tells the customer that an item was canceled and partially refunded.
  def item_canceled(order_item_id, refund_payload = {})
    @order_item        = OrderItem.find(order_item_id)
    @order             = @order_item.order
    @product           = @order_item.product_variant&.product
    @store_name        = StoreSetting.instance.event_name.presence || "Andrequicé"
    @public_url        = @order.public_tracking_url
    @refund_cents      = refund_payload[:refund_amount_cents] || refund_payload["refund_amount_cents"]
    @refund_percentage = refund_payload[:refund_percentage]   || refund_payload["refund_percentage"]
    @reason            = refund_payload[:reason]              || refund_payload["reason"]
    @actor_type        = (refund_payload[:actor_type]         || refund_payload["actor_type"]).to_s

    return unless @order.customer_email.present?

    mail(
      to:      @order.customer_email,
      from:    sender,
      subject: "Item cancelado e reembolsado — Pedido #{@order.number}"
    )
  end

  private

  def sender
    "#{@store_name} <#{ENV.fetch('SUPPORT_EMAIL', 'suporte@andrequice.store')}>"
  end
end

class ItemCancellationService
  Result = Struct.new(:success?, :status, :payload)

  VALID_ACTOR_TYPES = %i[admin customer].freeze

  def initialize(order_item:, actor:, actor_type:, reason: nil)
    @order_item = order_item
    @reason     = reason.to_s.strip.presence
    @actor      = actor
    @actor_type = actor_type&.to_sym
    raise ArgumentError, "actor_type must be one of #{VALID_ACTOR_TYPES}" unless VALID_ACTOR_TYPES.include?(@actor_type)
  end

  def call
    unless @order_item.made_to_order?
      return Result.new(false, :unprocessable_entity,
                        { error: "from_stock_cancellation_not_supported" })
    end

    unless cancellable?
      return Result.new(false, :unprocessable_entity,
                        { error: "invalid_transition",
                          message: "Item está em #{@order_item.production_status} e não pode ser cancelado." })
    end

    product    = @order_item.product_variant.product
    percentage = product.cancellation_refund_percentage.to_i
    line_total = @order_item.subtotal_cents.to_i
    refund_cents = (line_total * percentage / 100.0).round

    # Refund via Stripe first — only if it succeeds do we mutate state.
    # The state machine transition runs inside a transaction so any failure
    # *after* the refund (state machine, history) rolls back cleanly.
    stripe_refund = create_stripe_refund!(refund_cents)

    ActiveRecord::Base.transaction do
      @order_item.cancel!

      # Record the refund details on the order's status history so we have
      # an audit trail without introducing a new table this phase.
      OrderStatusHistory.create!(
        order:       @order_item.order,
        status:      @order_item.order.reload.status,
        title:       "Item cancelado com reembolso parcial",
        description: cancellation_description(refund_cents, percentage),
        created_by:  actor_label,
        metadata:    {
          order_item_id:       @order_item.id,
          stripe_refund_id:    stripe_refund.id,
          refund_amount_cents: refund_cents,
          refund_percentage:   percentage,
          reason:              @reason,
          actor_type:          @actor_type.to_s
        }
      )
    end

    # Notify the customer outside the transaction so a mailer hiccup can't
    # roll back the refund. perform_later → safe to enqueue post-commit.
    ProductionMailer.item_canceled(
      @order_item.id,
      refund_amount_cents: refund_cents,
      refund_percentage:   percentage,
      reason:              @reason,
      actor_type:          @actor_type.to_s
    ).deliver_later

    Result.new(true, :ok, {
      order_item_id:        @order_item.id,
      refund_amount_cents:  refund_cents,
      refund_percentage:    percentage,
      stripe_refund_id:     stripe_refund.id,
      new_order_status:     @order_item.order.reload.status,
      production_status:    @order_item.production_status
    })
  rescue Stripe::StripeError => e
    Rails.logger.error("[ItemCancellation] Stripe error on order_item=#{@order_item.id}: #{e.message}")
    Result.new(false, :bad_gateway,
               { error: "stripe_refund_failed", message: e.message })
  rescue OrderItem::InvalidProductionTransition => e
    Rails.logger.error("[ItemCancellation] Invalid transition on order_item=#{@order_item.id}: #{e.message}")
    Result.new(false, :unprocessable_entity,
               { error: "invalid_transition", message: e.message })
  end

  private

  def cancellable?
    @order_item.paid? || @order_item.in_production?
  end

  def create_stripe_refund!(amount_cents)
    Stripe::Refund.create(
      payment_intent: @order_item.order.stripe_intent_id,
      amount:         amount_cents,
      metadata:       {
        order_item_id:           @order_item.id,
        order_id:                @order_item.order.id,
        reason:                  @reason.to_s,
        actor:                   actor_label,
        cancellation_percentage: @order_item.product_variant.product.cancellation_refund_percentage
      }
    )
  end

  def actor_label
    return @actor_type.to_s unless @actor
    "#{@actor_type}:#{@actor.id}"
  end

  def cancellation_description(refund_cents, percentage)
    parts = [
      "Reembolso de R$ #{format('%.2f', refund_cents / 100.0)} (#{percentage}%) processado via Stripe."
    ]
    parts << "Motivo: #{@reason}" if @reason
    parts.join(" ")
  end
end

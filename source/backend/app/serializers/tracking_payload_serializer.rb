class TrackingPayloadSerializer
  def initialize(order)
    @order = order
  end

  def as_json(*)
    {
      number:                   @order.number,
      status:                   @order.status,
      status_label:             OrderStatusHistory.title_for(@order.status),
      delivery_method:          @order.delivery_method,
      created_at:               @order.created_at,
      estimated_delivery:       @order.estimated_delivery,
      promised_completion_date: @order.promised_completion_date,
      tracking_code:            @order.tracking_code,
      carrier:                  @order.carrier,
      shipping_service:         @order.shipping_service,
      items:                    @order.items.map { |i| serialize_item(i) },
      order_items:              serialize_order_items,
      items_total_cents:        @order.items_total_cents,
      shipping_fee_cents:       @order.shipping_fee_cents,
      total_cents:              @order.total_cents,
      timeline:                 serialize_timeline
    }
  end

  private

  def serialize_item(item)
    {
      name:             item["name"],
      size:             item["size"],
      quantity:         item["quantity"],
      unit_price_cents: item["unit_price_cents"],
      subtotal_cents:   item["subtotal_cents"]
    }
  end

  # Public-facing per-item status: production_status + promised date.
  # Also exposes fulfillment_mode + refund percentage so the customer UI can
  # decide whether to render a "Cancel item" button and pre-compute the
  # refund preview. We expose item.id intentionally — it's needed for the
  # cancel call, and the cancel endpoint validates ownership via the token
  # before doing anything.
  def serialize_order_items
    @order.order_items.includes(product_variant: :product).order(:id).map do |item|
      product = item.product_variant&.product
      {
        id:                              item.id,
        name:                            item.name,
        size:                            item.size,
        quantity:                        item.quantity,
        subtotal_cents:                  item.subtotal_cents,
        production_status:               item.production_status,
        promised_completion_date:        item.promised_completion_date,
        fulfillment_mode:                product&.fulfillment_mode,
        cancellation_refund_percentage:  product&.cancellation_refund_percentage
      }
    end
  end

  def serialize_timeline
    @order.status_histories.sort_by(&:created_at).map do |h|
      {
        status:      h.status,
        title:       h.title,
        description: h.description,
        created_at:  h.created_at
      }
    end
  end
end

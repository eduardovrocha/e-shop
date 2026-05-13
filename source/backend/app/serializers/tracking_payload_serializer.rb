class TrackingPayloadSerializer
  def initialize(order)
    @order = order
  end

  def as_json(*)
    {
      number:             @order.number,
      status:             @order.status,
      status_label:       OrderStatusHistory.title_for(@order.status),
      delivery_method:    @order.delivery_method,
      created_at:         @order.created_at,
      estimated_delivery: @order.estimated_delivery,
      tracking_code:      @order.tracking_code,
      carrier:            @order.carrier,
      shipping_service:   @order.shipping_service,
      items:              @order.items.map { |i| serialize_item(i) },
      items_total_cents:  @order.items_total_cents,
      shipping_fee_cents: @order.shipping_fee_cents,
      total_cents:        @order.total_cents,
      timeline:           serialize_timeline,
    }
  end

  private

  def serialize_item(item)
    {
      name:             item["name"],
      size:             item["size"],
      quantity:         item["quantity"],
      unit_price_cents: item["unit_price_cents"],
      subtotal_cents:   item["subtotal_cents"],
    }
  end

  def serialize_timeline
    @order.status_histories.sort_by(&:created_at).map do |h|
      {
        status:      h.status,
        title:       h.title,
        description: h.description,
        created_at:  h.created_at,
      }
    end
  end
end

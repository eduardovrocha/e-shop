class OrderDetailSerializer
  def initialize(order)
    @order = order
  end

  def as_json(*)
    {
      id:                  @order.id,
      number:              @order.number,
      stripe_intent_id:    @order.stripe_intent_id,
      customer_name:       @order.customer_name,
      customer_email:      @order.customer_email,
      customer_phone:      @order.customer_phone,
      delivery_method:     @order.delivery_method,
      status:              @order.status,
      items_total_cents:   @order.items_total_cents,
      shipping_fee_cents:  @order.shipping_fee_cents,
      total_cents:         @order.total_cents,
      items:               @order.items,
      shipping_address:    @order.shipping_address,
      tracking_url:        @order.public_tracking_url,
      tracking_code:       @order.tracking_code,
      notes:               @order.notes,
      carrier:             @order.carrier,
      shipping_service:    @order.shipping_service,
      estimated_delivery:  @order.estimated_delivery,
      created_at:          @order.created_at,
      updated_at:          @order.updated_at,
      status_histories:    serialize_histories,
    }
  end

  private

  def serialize_histories
    @order.status_histories.sort_by(&:created_at).map do |h|
      {
        id:          h.id,
        status:      h.status,
        title:       h.title,
        description: h.description,
        created_by:  h.created_by,
        created_at:  h.created_at,
      }
    end
  end
end

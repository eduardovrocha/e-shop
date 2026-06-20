class OrderSerializer
  def initialize(order)
    @order = order
  end

  def as_json(*)
    {
      id:                 @order.id,
      number:             @order.number,
      customer_name:      @order.customer_name,
      customer_email:     @order.customer_email,
      customer_phone:     @order.customer_phone,
      delivery_method:    @order.delivery_method,
      source:                  @order.source,
      external_payment_method: @order.external_payment_method,
      status:             @order.status,
      items_total_cents:  @order.items_total_cents,
      shipping_fee_cents: @order.shipping_fee_cents,
      total_cents:        @order.total_cents,
      tracking_code:      @order.tracking_code,
      carrier:            @order.carrier,
      shipping_service:   @order.shipping_service,
      created_at:         @order.created_at,
      updated_at:         @order.updated_at
    }
  end
end

class OrderDetailSerializer
  def initialize(order)
    @order = order
  end

  def as_json(*)
    {
      id:                       @order.id,
      number:                   @order.number,
      stripe_intent_id:         @order.stripe_intent_id,
      customer_name:            @order.customer_name,
      customer_email:           @order.customer_email,
      customer_phone:           @order.customer_phone,
      delivery_method:          @order.delivery_method,
      status:                   @order.status,
      items_total_cents:        @order.items_total_cents,
      shipping_fee_cents:       @order.shipping_fee_cents,
      total_cents:              @order.total_cents,
      items:                    @order.items,
      order_items:              serialize_order_items,
      promised_completion_date: @order.promised_completion_date,
      shipping_address:         @order.shipping_address,
      tracking_url:             @order.public_tracking_url,
      tracking_code:            @order.tracking_code,
      notes:                    @order.notes,
      carrier:                  @order.carrier,
      shipping_service:         @order.shipping_service,
      estimated_delivery:       @order.estimated_delivery,
      created_at:               @order.created_at,
      updated_at:               @order.updated_at,
      status_histories:         serialize_histories
    }
  end

  private

  def serialize_order_items
    @order.order_items.includes(product_variant: :product).order(:id).map do |item|
      product = item.product_variant&.product
      {
        id:                              item.id,
        product_variant_id:              item.product_variant_id,
        product_id:                      item.product_id,
        name:                            item.name,
        size:                            item.size,
        quantity:                        item.quantity,
        unit_price_cents:                item.unit_price_cents,
        subtotal_cents:                  item.subtotal_cents,
        production_status:               item.production_status,
        promised_completion_date:        item.promised_completion_date,
        production_started_at:           item.production_started_at,
        production_completed_at:         item.production_completed_at,
        fulfillment_mode:                product&.fulfillment_mode,
        cancellation_refund_percentage:  product&.cancellation_refund_percentage
      }
    end
  end

  def serialize_histories
    @order.status_histories.sort_by(&:created_at).map do |h|
      {
        id:          h.id,
        status:      h.status,
        title:       h.title,
        description: h.description,
        created_by:  h.created_by,
        created_at:  h.created_at
      }
    end
  end
end

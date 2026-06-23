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
      tax_id_formatted:         @order.tax_id_formatted,
      tax_id_kind:              @order.tax_id_kind,
      delivery_method:          @order.delivery_method,
      status:                   @order.status,
      items_total_cents:        @order.items_total_cents,
      shipping_fee_cents:       @order.shipping_fee_cents,
      total_cents:              @order.total_cents,
      # Aggregated profit metrics for the order footer. Items without a
      # cost snapshot are EXCLUDED from the totals — UI surfaces the
      # gap explicitly via items_missing_cost so the operator knows the
      # numbers are partial. Wraps everything (and the per-item math) so
      # the frontend doesn't reimplement the rules.
      **profit_aggregates,
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

  # Order-level rollup of cost/profit. Items without a cost snapshot are
  # NOT silently treated as zero — they're counted separately so the UI
  # can render a "X de N itens sem custo definido" warning when present.
  # When ALL items lack cost the entire summary collapses to nil (UI
  # shows a single "Definir custos" CTA instead of misleading numbers).
  def profit_aggregates
    items                 = @order.order_items.to_a
    items_with_cost       = items.reject { |i| i.unit_cost_cents.nil? }
    items_missing_cost    = items.size - items_with_cost.size
    revenue_with_cost     = items_with_cost.sum(&:subtotal_cents)
    total_cost_cents      = items_with_cost.sum(&:cost_subtotal_cents)
    gross_profit_cents    = revenue_with_cost - total_cost_cents
    margin_percentage     =
      if revenue_with_cost.positive?
        (gross_profit_cents.to_f / revenue_with_cost * 100).round(2)
      end

    if items_with_cost.empty?
      {
        total_cost_cents:             nil,
        order_gross_profit_cents:     nil,
        order_margin_percentage:      nil,
        items_with_cost_count:        0,
        items_missing_cost_count:     items.size
      }
    else
      {
        total_cost_cents:             total_cost_cents,
        order_gross_profit_cents:     gross_profit_cents,
        order_margin_percentage:      margin_percentage,
        items_with_cost_count:        items_with_cost.size,
        items_missing_cost_count:     items_missing_cost
      }
    end
  end

  def serialize_order_items
    @order.order_items.includes(product_variant: :product).order(:id).map do |item|
      product = item.product_variant&.product
      variant = item.product_variant
      {
        id:                              item.id,
        product_variant_id:              item.product_variant_id,
        product_id:                      item.product_id,
        name:                            item.name,
        size:                            item.size,
        # gender/cut are derived from the linked variant. nil if the variant
        # was deleted post-purchase. Frontend renders them next to size.
        gender:                          variant&.gender,
        cut:                             variant&.cut,
        quantity:                        item.quantity,
        unit_price_cents:                item.unit_price_cents,
        subtotal_cents:                  item.subtotal_cents,
        # Profit fields — admin-only. Snapshotted at purchase time; nil
        # when cost wasn't recorded (legacy / not-yet-configured). UI
        # must render "—" rather than treating null as zero.
        unit_cost_cents:                 item.unit_cost_cents,
        cost_subtotal_cents:             item.cost_subtotal_cents,
        gross_profit_cents:              item.gross_profit_cents,
        margin_percentage:               item.margin_percentage,
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

# Materialização e ativação de itens de um pedido pago, compartilhada entre o
# webhook do Stripe (pedido do site) e o registro de pedido manual no admin.
#
# É o ÚNICO ponto que: (a) deduz estoque dos itens from_stock, (b) cria as
# linhas OrderItem a partir do snapshot e (c) dirige cada item por mark_paid!
# para que a máquina de estados dispare seus efeitos (skip-to-ready_to_ship
# para from_stock, avanço da fila de produção para made_to_order). Não duplicar
# essa lógica em outro lugar.
module OrderFulfillmentService
  module_function

  # Atomically decrements stock_quantity and clears the matching reservation
  # for each from_stock variant in the enriched items snapshot. made_to_order
  # variants don't decrement physical stock at payment.
  def deduct_stock!(items_snapshot)
    items_snapshot.each do |item|
      variant_id = item["variant_id"].to_i
      qty        = [ item["quantity"].to_i, 1 ].max
      next if variant_id.zero?

      begin
        variant = ProductVariant.find_by(id: variant_id)
        unless variant
          Rails.logger.error "[Stock] Variant #{variant_id} not found — skipping deduction"
          next
        end

        if variant.product&.made_to_order?
          Rails.logger.info "[Stock] Skipping deduction for made_to_order variant #{variant.id} (#{variant.sku})"
          next
        end

        variant.decrement_stock!(qty)

        # Release the reservation that was created at create_intent time.
        # Uses [reserved, qty].min to stay non-negative in the edge case
        # where payment_failed already ran and cleared the reservation first.
        variant.decrement!(:reserved_quantity, [ variant.reserved_quantity, qty ].min)

        Rails.logger.info "[Stock] Deducted #{qty}× variant #{variant.id} (#{variant.sku}) — stock=#{variant.reload.stock_quantity} reserved=#{variant.reserved_quantity}"
      rescue ProductVariant::InsufficientStockError => e
        Rails.logger.error "[Stock] #{e.message}"
      rescue => e
        Rails.logger.error "[Stock] Unexpected error for variant #{variant_id}: #{e.message}"
      end
    end
  end

  # Creates one OrderItem row per item in the snapshot and stamps the per-item
  # promised_completion_date from the create_intent snapshot. Items whose
  # variant has been deleted are skipped — the order's items JSONB still
  # carries the historical record for those.
  def create_order_items_for!(order, items_snapshot, promised_snapshot)
    promised_by_variant = (promised_snapshot || []).each_with_object({}) do |entry, h|
      h[entry["variant_id"].to_i] = entry["promised_completion_days"].to_i
    end

    items_snapshot.each do |item|
      variant_id = item["variant_id"].to_i
      variant    = ProductVariant.find_by(id: variant_id)
      next unless variant

      days = promised_by_variant[variant_id] || 0
      OrderItem.create!(
        order:                    order,
        product_variant:          variant,
        product:                  variant.product,
        name:                     item["name"],
        size:                     item["size"],
        quantity:                 item["quantity"].to_i,
        unit_price_cents:         item["unit_price_cents"].to_i,
        subtotal_cents:           item["subtotal_cents"].to_i,
        # Snapshot production cost at purchase time so future admin edits to the
        # variant/product cost don't rewrite history. nil when neither variant
        # nor product has cost defined yet.
        unit_cost_cents:          variant.effective_unit_cost_cents,
        production_status:        :pending,
        promised_completion_date: days.days.from_now.to_date
      )
    end
  end

  # Drives each materialized item through mark_paid! so the per-item state
  # machine fires its callbacks, then stamps the order with the max promised
  # date across items.
  def activate_items!(order)
    order.order_items.reload.each(&:mark_paid!)
    max_promised = order.order_items.maximum(:promised_completion_date)
    order.update!(promised_completion_date: max_promised) if max_promised
  end
end

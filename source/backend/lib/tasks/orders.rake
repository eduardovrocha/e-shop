namespace :orders do
  # Backfills OrderItem.name + unit/subtotal cents and the matching keys in
  # order.items (JSONB) when they arrived blank/zero. Originated as a fix
  # for an enrich_items_snapshot bug that used variant.price_cents instead
  # of effective_price_cents — variants that inherit their price from the
  # parent product were persisted with unit_price_cents=0 and a nil name.
  #
  # Uses the variant's CURRENT effective_price_cents (and product.name).
  # That's fine for dev data; for production it can drift if the product
  # price changed between the original purchase and this run. update_columns
  # is used to bypass validations/callbacks — this is a pure data fix.
  #
  # Run:  bundle exec rails orders:backfill_item_data
  desc "Backfill missing OrderItem name + recompute unit_price/subtotal from current variant prices"
  task backfill_item_data: :environment do
    fixed_items   = 0
    fixed_jsonb   = 0
    fixed_orders  = 0
    skipped_items = 0

    Order.includes(order_items: { product_variant: :product }).find_each do |order|
      order_changed = false

      # ── 1. Fix OrderItem rows ──────────────────────────────────────────
      order.order_items.each do |oi|
        variant = oi.product_variant
        product = variant&.product
        unless variant && product
          skipped_items += 1
          next
        end

        qty       = oi.quantity.to_i
        eff_price = variant.effective_price_cents.to_i

        target_name = oi.name.presence || product.name
        target_unit = oi.unit_price_cents.to_i.zero? ? eff_price : oi.unit_price_cents.to_i
        target_sub  = target_unit * qty

        next if oi.name == target_name &&
                oi.unit_price_cents.to_i == target_unit &&
                oi.subtotal_cents.to_i == target_sub

        oi.update_columns(
          name:             target_name,
          unit_price_cents: target_unit,
          subtotal_cents:   target_sub
        )
        fixed_items += 1
        order_changed = true
      end

      # ── 2. Fix order.items JSONB ───────────────────────────────────────
      if order.items.is_a?(Array) && order.items.any?
        items_array  = order.items.map { |it| it.is_a?(Hash) ? it.dup : it }
        json_changed = false

        items_array.each do |item|
          next unless item.is_a?(Hash)

          variant_id = (item["variant_id"] || item[:variant_id]).to_i
          variant    = ProductVariant.find_by(id: variant_id)
          product    = variant&.product
          next unless variant && product

          qty       = (item["quantity"] || item[:quantity]).to_i
          eff_price = variant.effective_price_cents.to_i

          if (item["name"] || item[:name]).blank?
            item["name"] = product.name
            json_changed = true
          end

          if (item["unit_price_cents"] || item[:unit_price_cents]).to_i.zero? && eff_price.positive?
            item["unit_price_cents"] = eff_price
            json_changed = true
          end

          if (item["subtotal_cents"] || item[:subtotal_cents]).to_i.zero? && eff_price.positive? && qty.positive?
            item["subtotal_cents"] = eff_price * qty
            json_changed = true
          end
        end

        if json_changed
          order.update_columns(items: items_array)
          fixed_jsonb += 1
          order_changed = true
        end
      end

      fixed_orders += 1 if order_changed
    end

    puts "── orders:backfill_item_data ────────────────────────────────────"
    puts "OrderItem rows fixed: #{fixed_items}"
    puts "Orders with JSONB fixed: #{fixed_jsonb}"
    puts "Orders touched: #{fixed_orders}"
    puts "OrderItem rows skipped (variant/product missing): #{skipped_items}"
  end
end

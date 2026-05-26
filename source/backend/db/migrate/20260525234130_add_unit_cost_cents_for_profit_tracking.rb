class AddUnitCostCentsForProfitTracking < ActiveRecord::Migration[7.2]
  # Adds production cost to three tables so the admin can compute
  # per-item and per-order profit:
  #
  # - products.unit_cost_cents          → product-level default
  # - product_variants.unit_cost_cents  → optional override per variant
  #                                       (mirrors compare_at_price pattern)
  # - order_items.unit_cost_cents       → snapshotted on purchase, used by
  #                                       all profit math. Frozen value
  #                                       guarantees old orders don't drift
  #                                       when the admin updates costs later.
  #
  # All three nullable: null encodes "cost not yet defined" which the UI
  # surfaces explicitly rather than pretending profit = revenue.
  def change
    add_column :products,          :unit_cost_cents, :integer
    add_column :product_variants,  :unit_cost_cents, :integer
    add_column :order_items,       :unit_cost_cents, :integer

    # Backfill order_items with the current product cost so historical KPIs
    # have something to render. Joined SQL is much faster than iterating in
    # Ruby — and this only runs once. We pick variant-level cost when
    # present, otherwise fall back to product-level (mirrors the runtime
    # fallback logic). NULL costs stay NULL (UI will mark as "not defined").
    reversible do |dir|
      dir.up do
        execute <<~SQL.squish
          UPDATE order_items
             SET unit_cost_cents = COALESCE(pv.unit_cost_cents, p.unit_cost_cents)
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
           WHERE order_items.product_variant_id = pv.id
             AND order_items.unit_cost_cents IS NULL
             AND COALESCE(pv.unit_cost_cents, p.unit_cost_cents) IS NOT NULL
        SQL
      end
    end
  end
end

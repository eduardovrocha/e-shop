# When the admin defines (or updates) production cost on a product or
# variant, retroactively fill order_items that have never had a cost
# snapshot — i.e. unit_cost_cents IS NULL.
#
# Important invariant: items that ALREADY have a snapshot are left alone.
# That preserves the snapshot-at-purchase guarantee for steady-state
# operation. Only the legacy / first-rollout gap is closed.
#
# Two entry points to mirror the two save sites:
#
#   OrderItemCostBackfiller.from_product(product)
#   OrderItemCostBackfiller.from_variant(variant)
#
# Both return the number of rows touched.
class OrderItemCostBackfiller
  class << self
    # Backfills items whose variant doesn't override unit_cost_cents AND
    # whose own snapshot is null. Variant-level override has priority and
    # is handled separately (from_variant).
    def from_product(product)
      cost = product.unit_cost_cents
      return 0 if cost.blank?

      OrderItem.joins(:product_variant)
               .where(product_id: product.id, unit_cost_cents: nil)
               .where(product_variants: { unit_cost_cents: nil })
               .update_all(unit_cost_cents: cost)
    end

    # Backfills items linked to this variant whose snapshot is null —
    # variant override always wins over product fallback.
    def from_variant(variant)
      cost = variant.unit_cost_cents
      return 0 if cost.blank?

      OrderItem.where(product_variant_id: variant.id, unit_cost_cents: nil)
               .update_all(unit_cost_cents: cost)
    end
  end
end

import type { Product, VariantStock } from '@/types/product'

// Single source of truth for "can the customer pick / add this variant?"
// Centralizing here keeps the made_to_order rule from leaking into every
// component that touches stock. Spec naming below mirrors the proposal
// in the bugfix prompt (isVariantPurchasable / maxPurchasableQuantity);
// internally we map to the frontend types (Product/VariantStock) instead
// of the backend's available_quantity vocabulary.

// "Can I select & add this variant?"
//   - made_to_order: yes, always (any cataloged variant is buyable;
//     the backend create_intent gates by production capacity)
//   - from_stock:    only if free stock > 0
export function isVariantPurchasable(
  product: Pick<Product, 'fulfillmentMode'>,
  variant: Pick<VariantStock, 'stock'>
): boolean {
  if (product.fulfillmentMode === 'made_to_order') return true
  return variant.stock > 0
}

// Upper bound for the quantity stepper.
//   - made_to_order: 99 (UI cap only; capacity validated server-side)
//   - from_stock:    free stock (never below 0)
export function maxPurchasableQuantity(
  product: Pick<Product, 'fulfillmentMode'>,
  variant: Pick<VariantStock, 'stock'>
): number {
  if (product.fulfillmentMode === 'made_to_order') return 99
  return Math.max(0, variant.stock)
}

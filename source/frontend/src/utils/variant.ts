import type { Product, VariantStock, VariantGender, VariantCut } from '@/types/product'
import { VARIANT_GENDER_LABEL, VARIANT_CUT_LABEL } from '@/types/product'

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

// Builds the descriptor prefix shown on every cart/checkout/confirmation
// line — "Masculino · Babylook · Tam. M". Shows every dimension that the
// backend exposed, including the defaults (Unissex / Normal), so the buyer
// sees exactly what they bought and there's no ambiguity in the receipt.
export function formatVariantLine(opts: {
  gender?: VariantGender | null
  cut?:    VariantCut    | null
  size?:   string | null
  sizeLabel?: string   // "Tamanho" (cart) or "Tam." (summary) — caller picks
}): string {
  const parts: string[] = []
  if (opts.gender) parts.push(VARIANT_GENDER_LABEL[opts.gender])
  if (opts.cut)    parts.push(VARIANT_CUT_LABEL[opts.cut])
  if (opts.size)   parts.push(`${opts.sizeLabel ?? 'Tam.'} ${opts.size}`)
  return parts.join(' · ')
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

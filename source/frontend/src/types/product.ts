// Mirror of backend ProductVariant::GENDERS / CUTS. Keep in sync.
export const VARIANT_GENDERS = ['unissex', 'masculino', 'feminino'] as const
export type VariantGender = (typeof VARIANT_GENDERS)[number]

export const VARIANT_CUTS = ['normal', 'babylook', 'polo', 'regata', 'oversized'] as const
export type VariantCut = (typeof VARIANT_CUTS)[number]

export const VARIANT_GENDER_LABEL: Record<VariantGender, string> = {
  unissex:   'Unissex',
  masculino: 'Masculino',
  feminino:  'Feminino',
}

export const VARIANT_CUT_LABEL: Record<VariantCut, string> = {
  normal:    'Normal',
  babylook:  'Babylook',
  polo:      'Polo',
  regata:    'Regata',
  oversized: 'Oversized',
}

export interface VariantStock {
  variantId: number
  size: string
  gender: VariantGender
  cut: VariantCut
  stock: number
  priceCents: number       // always present — mandatory per variant
  effectivePrice: number   // priceCents / 100
  // Promo "de" price for this variant — variant override OR product
  // fallback. null when this variant is not on sale.
  compareAtPriceCents: number | null
  onSale: boolean
  available: boolean
}

export type FulfillmentMode = 'from_stock' | 'made_to_order'

export interface Product {
  id: number
  name: string
  description: string | null
  category: string
  price: number
  minPrice: number
  maxPrice: number
  // Product-level "de" price (currency units, not cents). null when the
  // product is not on sale at the product level — variants may still
  // override per-size via VariantStock.compareAtPriceCents.
  compareAtPrice: number | null
  // Range across variants (variant override OR product fallback). Useful
  // for the catalog card when sizes have different promo prices.
  minComparePrice: number | null
  maxComparePrice: number | null
  images: string[]
  sizes: string[]
  variants: VariantStock[]
  stock: number
  badge?: string
  slug: string
  fulfillmentMode: FulfillmentMode
  productionLeadTimeDays: number | null
  estimatedCompletionDays: number | null
}

export type Size = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'GGG' | 'U'

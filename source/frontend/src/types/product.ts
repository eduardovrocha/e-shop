export interface VariantStock {
  variantId: number
  size: string
  stock: number
  priceCents: number       // always present — mandatory per variant
  effectivePrice: number   // priceCents / 100
  available: boolean
}

export type FulfillmentMode = 'from_stock' | 'made_to_order'

export interface Product {
  id: number
  name: string
  description: string
  category: string
  price: number
  minPrice: number
  maxPrice: number
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

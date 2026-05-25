// Enum-style options mirroring backend constants in ProductVariant.
// Keep these in sync if the Ruby model gains a new value.
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

export interface ProductVariant {
  id: number
  size: string
  color?: string
  gender: VariantGender
  cut: VariantCut
  sku: string
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  price_cents: number | null
  // Promo "de" price for THIS variant. null means: fall back to the
  // product-level compare_at_price_cents (or no promo at all).
  compare_at_price_cents: number | null
  effective_price_cents: number
  // variant-level override OR product fallback (computed server-side).
  effective_compare_at_price_cents: number | null
  on_sale: boolean
  additional_price_cents: number
}

export interface VariantPayload {
  id?: number
  size: string
  color?: string
  gender: VariantGender
  cut: VariantCut
  sku: string
  stock_quantity: number
  price_cents?: number | null
  compare_at_price_cents?: number | null
  additional_price_cents?: number
  _destroy?: boolean
}

export interface ProductImage {
  id: number
  filename: string
  content_type: string
  byte_size: number
  url: string
  thumb_url: string
}

export type FulfillmentMode = 'from_stock' | 'made_to_order'

export interface Product {
  id: number
  name: string
  description: string
  price_cents: number
  category: string
  slug: string
  active: boolean
  images: ProductImage[]
  variants: ProductVariant[]
  total_stock: number
  has_dimensions: boolean
  weight_g: number | null
  height_mm: number | null
  width_mm: number | null
  length_mm: number | null
  fulfillment_mode: FulfillmentMode
  production_lead_time_days: number | null
  production_capacity: number | null
  cancellation_refund_percentage: number | null
  estimated_completion_days: number | null
  created_at: string
  updated_at: string
}

export interface ProductsResponse {
  products: Product[]
  meta: {
    current_page: number
    total_pages: number
    total_count: number
    per_page: number
  }
}

export interface ProductVariant {
  id: number
  size: string
  color?: string
  sku: string
  stock_quantity: number
  reserved_quantity: number
  available_quantity: number
  price_cents: number | null
  effective_price_cents: number
  additional_price_cents: number
}

export interface VariantPayload {
  id?: number
  size: string
  color?: string
  sku: string
  stock_quantity: number
  price_cents?: number | null
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

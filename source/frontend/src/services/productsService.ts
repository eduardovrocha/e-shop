import api from '@/services/api'
import type { Product, VariantStock, VariantGender, VariantCut, FulfillmentMode } from '@/types/product'

interface BackendVariantStock {
  variant_id: number
  size: string
  gender: VariantGender
  cut: VariantCut
  stock: number
  price_cents: number
  compare_at_price_cents: number | null
  effective_price_cents: number
  on_sale: boolean
  available: boolean
}

interface BackendProduct {
  id: number
  name: string
  description: string
  category: string
  price_cents: number
  compare_at_price_cents: number | null
  min_compare_at_price_cents: number | null
  max_compare_at_price_cents: number | null
  min_price_cents: number
  max_price_cents: number
  slug: string
  images: string[]
  total_stock: number
  sizes: string[]
  variant_stock: BackendVariantStock[]
  fulfillment_mode?: FulfillmentMode
  production_lead_time_days?: number | null
  estimated_completion_days?: number | null
}

function toProduct(p: BackendProduct): Product {
  const variants: VariantStock[] = (p.variant_stock ?? []).map((v) => ({
    variantId:           v.variant_id,
    size:                v.size,
    // Default to unissex/normal so old backend builds that haven't yet
    // serialized these fields don't break the picker.
    gender:              v.gender ?? 'unissex',
    cut:                 v.cut    ?? 'normal',
    stock:               v.stock,
    priceCents:          v.price_cents,
    effectivePrice:      v.price_cents / 100,
    compareAtPriceCents: v.compare_at_price_cents,
    onSale:              v.on_sale,
    available:           v.available,
  }))

  const stock = p.total_stock
  let badge: string | undefined
  if (stock === 0) badge = 'Esgotado'
  else if (stock <= 5) badge = 'Últimas unidades'

  // min/max price computed from variant prices on the backend
  const minPrice = (p.min_price_cents ?? p.price_cents) / 100
  const maxPrice = (p.max_price_cents ?? p.price_cents) / 100

  return {
    id:               p.id,
    name:             p.name,
    description:      p.description,
    category:         p.category ?? 'outros',
    price:            p.price_cents / 100,
    minPrice,
    maxPrice,
    compareAtPrice:   p.compare_at_price_cents != null ? p.compare_at_price_cents / 100 : null,
    minComparePrice:  p.min_compare_at_price_cents != null ? p.min_compare_at_price_cents / 100 : null,
    maxComparePrice:  p.max_compare_at_price_cents != null ? p.max_compare_at_price_cents / 100 : null,
    slug:        p.slug,
    images:      p.images.length > 0 ? p.images : [`https://picsum.photos/seed/prod${p.id}/480/600`],
    sizes:       p.sizes,
    variants,
    stock,
    badge,
    fulfillmentMode:         p.fulfillment_mode ?? 'from_stock',
    productionLeadTimeDays:  p.production_lead_time_days ?? null,
    estimatedCompletionDays: p.estimated_completion_days ?? null,
  }
}

export const productsService = {
  list: () =>
    api
      .get<{ products: BackendProduct[] }>('/products')
      .then((r) => r.data.products.map(toProduct)),

  get: (id: number) =>
    api.get<BackendProduct>(`/products/${id}`).then((r) => toProduct(r.data)),
}

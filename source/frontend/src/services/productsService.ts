import api from '@/services/api'
import type { Product, VariantStock } from '@/types/product'

interface BackendVariantStock {
  variant_id: number
  size: string
  stock: number
  price_cents: number
  effective_price_cents: number
  available: boolean
}

interface BackendProduct {
  id: number
  name: string
  description: string
  category: string
  price_cents: number
  min_price_cents: number
  max_price_cents: number
  slug: string
  images: string[]
  total_stock: number
  sizes: string[]
  variant_stock: BackendVariantStock[]
}

function toProduct(p: BackendProduct): Product {
  const variants: VariantStock[] = (p.variant_stock ?? []).map((v) => ({
    variantId:     v.variant_id,
    size:          v.size,
    stock:         v.stock,
    priceCents:    v.price_cents,
    effectivePrice: v.price_cents / 100,
    available:     v.available,
  }))

  const stock = p.total_stock
  let badge: string | undefined
  if (stock === 0) badge = 'Esgotado'
  else if (stock <= 5) badge = 'Últimas unidades'

  // min/max price computed from variant prices on the backend
  const minPrice = (p.min_price_cents ?? p.price_cents) / 100
  const maxPrice = (p.max_price_cents ?? p.price_cents) / 100

  return {
    id:          p.id,
    name:        p.name,
    description: p.description,
    category:    p.category ?? 'outros',
    price:       p.price_cents / 100,
    minPrice,
    maxPrice,
    slug:        p.slug,
    images:      p.images.length > 0 ? p.images : [`https://picsum.photos/seed/prod${p.id}/480/600`],
    sizes:       p.sizes,
    variants,
    stock,
    badge,
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

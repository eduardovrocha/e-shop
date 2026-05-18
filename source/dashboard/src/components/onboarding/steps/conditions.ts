import { productsService } from '@/services/productsService'

let cachedManufactured: boolean | null = null

/**
 * True when the store has at least one made-to-order product.
 *
 * Result is cached for the lifetime of the page session so the production
 * step does not re-probe the API on every tooltip transition. The cache is
 * intentionally module-scoped — a hard reload (which is what happens after
 * creating a product and returning to the dashboard) clears it.
 */
export async function storeHasManufacturedProduct(): Promise<boolean> {
  if (cachedManufactured !== null) return cachedManufactured
  try {
    const res = await productsService.list({ per_page: 100 })
    cachedManufactured = res.products.some((p) => p.fulfillment_mode === 'made_to_order')
    return cachedManufactured
  } catch {
    return false
  }
}

/** Test-only — resets the module cache. */
export function __resetConditionsCache() {
  cachedManufactured = null
}

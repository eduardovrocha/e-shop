import { ordersService } from '@/services/ordersService'
import { productsService } from '@/services/productsService'

let cachedManufactured: boolean | null = null
let cachedLatestPaidOrderId: number | null = null

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

/**
 * Returns the most recent paid order ID, or null if no paid order exists
 * (or the API fails). Used by Phase 2 step 2.1 to dynamically resolve the
 * `/orders/:id` route to the actual order the user is about to inspect.
 */
export async function latestPaidOrderId(): Promise<number | null> {
  if (cachedLatestPaidOrderId !== null) return cachedLatestPaidOrderId
  try {
    const res = await ordersService.list({ per_page: 1, status: 'paid' })
    const id = res.orders[0]?.id ?? null
    if (id !== null) cachedLatestPaidOrderId = id
    return id
  } catch {
    return null
  }
}

/** Test-only — resets the module cache. */
export function __resetConditionsCache() {
  cachedManufactured = null
  cachedLatestPaidOrderId = null
}

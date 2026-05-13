import { useState, useEffect } from 'react'
import { storeService, type StoreInfo } from '@/services/storeService'

const FALLBACK_SHIPPING_CENTS = 1890

export function useStore() {
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    storeService
      .get()
      .then((data) => { if (!cancelled) setStore(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoading(false) })
    return () => { cancelled = true }
  }, [])

  return {
    store,
    isLoading,
    shippingFeeCents: store?.shipping_fee_cents ?? FALLBACK_SHIPPING_CENTS,
    freeShippingAboveCents: store?.free_shipping_above_cents ?? 0,
  }
}

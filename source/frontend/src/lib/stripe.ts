import { loadStripe, type Stripe } from '@stripe/stripe-js'
import api from '@/services/api'

export type StripeMode = 'test' | 'live'

export interface StripeConfig {
  publishableKey: string
  mode: StripeMode
}

// Single in-memory cache for the duration of the SPA session.
// No localStorage: the active mode can change in the admin and we want
// the next full page load to pick that up. Promise-cached so concurrent
// callers share one /api/v1/stripe/config fetch and one loadStripe call.
let configPromise: Promise<StripeConfig> | null = null
let stripePromiseInternal: Promise<Stripe | null> | null = null

async function fetchConfig(): Promise<StripeConfig> {
  const { data } = await api.get<{ publishable_key: string; mode: StripeMode }>(
    '/stripe/config',
  )
  return { publishableKey: data.publishable_key ?? '', mode: data.mode }
}

export function getStripeConfig(): Promise<StripeConfig> {
  if (!configPromise) {
    configPromise = fetchConfig().catch((err) => {
      // Reset on failure so a retry can refetch instead of replaying the error.
      configPromise = null
      throw err
    })
  }
  return configPromise
}

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromiseInternal) {
    stripePromiseInternal = getStripeConfig().then((config) => {
      if (!config.publishableKey) {
        console.warn(
          '[Stripe] publishable key vazia. Configure-a em /admin/stripe no dashboard.',
        )
        return null
      }
      return loadStripe(config.publishableKey)
    })
  }
  return stripePromiseInternal
}

// Test-only escape hatch — never call this in production code paths.
export function __resetStripeCacheForTests(): void {
  configPromise = null
  stripePromiseInternal = null
}

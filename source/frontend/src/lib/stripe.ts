import { loadStripe } from '@stripe/stripe-js'

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined

if (!key) {
  console.warn('[Stripe] VITE_STRIPE_PUBLISHABLE_KEY não definida. Pagamentos desativados.')
}

export const stripePromise = key ? loadStripe(key) : null

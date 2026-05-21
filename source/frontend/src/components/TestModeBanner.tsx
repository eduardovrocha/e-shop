import { useStripeConfig } from '@/hooks/useStripeConfig'

// Persistent banner shown when Stripe is operating in test mode, regardless
// of Rails.env. Renders null in live mode so the DOM stays empty.
export function TestModeBanner() {
  const { config } = useStripeConfig()

  if (config?.mode !== 'test') return null

  return (
    <div
      role="status"
      className="sticky top-0 z-50 w-full border-b-2 border-amber-600 bg-amber-400 py-3 px-4 text-center text-sm font-bold text-black"
    >
      ⚠️ AMBIENTE DE TESTE — NENHUMA COBRANÇA REAL SERÁ EFETUADA
    </div>
  )
}

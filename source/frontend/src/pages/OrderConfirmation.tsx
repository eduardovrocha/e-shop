import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'

export default function OrderConfirmation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clearCart = useCartStore((s) => s.clearCart)
  const clearCheckout = useCheckoutStore((s) => s.clear)

  useEffect(() => {
    clearCart()
    clearCheckout()
  }, [clearCart, clearCheckout])

  // Stripe may redirect here with payment_intent and payment_intent_client_secret
  const paymentIntentId = searchParams.get('payment_intent')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center gap-6">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-andrequice-gold/10 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-andrequice-gold">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M7 12.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl text-andrequice-navy">Pedido confirmado!</h1>
          <p className="text-sm text-andrequice-border max-w-xs mx-auto">
            Recebemos seu pagamento com sucesso. Você receberá um email com o link de acompanhamento do pedido.
          </p>
        </div>

        {paymentIntentId && (
          <p className="text-xs text-andrequice-border font-mono bg-andrequice-sand/50 px-3 py-1.5 rounded-lg">
            Ref: {paymentIntentId.slice(-8).toUpperCase()}
          </p>
        )}

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button variant="gold" size="lg" fullWidth onClick={() => navigate('/catalog')}>
            Continuar comprando
          </Button>
          <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>
  )
}

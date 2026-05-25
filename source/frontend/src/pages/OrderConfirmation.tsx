import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { Badge } from '@/components/Badge'
import { useCartStore, type CartItem } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { formatPrice } from '@/lib/utils'
import { formatShippingLine } from '@/utils/shipping'
import { formatVariantLine } from '@/utils/variant'
import { formatInstallmentLabel, type InstallmentCount } from '@/utils/installments'

// Snapshot shape passed in via location.state.order from Checkout.tsx
// at the moment Stripe confirmPayment succeeds.
interface OrderSnapshot {
  paymentIntentId: string | null
  totalCents: number
  subtotalCents: number
  shippingFeeCents: number
  promisedDate: string | null // YYYY-MM-DD
  installmentCount?: InstallmentCount
  deliveryMethod: 'delivery' | 'pickup'
  contact: { name: string; email: string; phone: string }
  shippingAddress: { cep: string; street: string; city: string; state: string } | null
  addressExtra: { number: string; complement: string }
  selectedShipping: {
    serviceId: number; priceCents: number; carrier: string
    service: string; deliveryDays: number
  } | null
  items: CartItem[]
}

type Outcome = 'success' | 'failed' | 'processing' | 'unknown'

export default function OrderConfirmation() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const clearCart = useCartStore((s) => s.clearCart)
  const clearCheckout = useCheckoutStore((s) => s.clear)

  // ── Decide outcome from Stripe redirect status (if any) ─────────────────
  // Stripe appends ?redirect_status={succeeded|processing|requires_payment_method|...}
  // on 3DS redirect flows. With in-element confirmation (no 3DS) it is
  // absent — in which case arrival to this page already implies success.
  // Order snapshot: prefer location.state (in-element confirmation), fall
  // back to sessionStorage (3DS redirect flow, where SPA state is wiped).
  const order = useMemo<OrderSnapshot | null>(() => {
    const fromState = (location.state as { order?: OrderSnapshot } | null)?.order
    if (fromState) return fromState
    try {
      const raw = sessionStorage.getItem('andrequice-pending-order')
      return raw ? (JSON.parse(raw) as OrderSnapshot) : null
    } catch {
      return null
    }
  }, [location.state])

  const outcome: Outcome = useMemo(() => {
    const s = searchParams.get('redirect_status')
    if (s === 'succeeded') return 'success'
    if (s === 'processing') return 'processing'
    if (s === 'requires_payment_method' || s === 'requires_action' || s === 'requires_confirmation') return 'failed'
    // No redirect_status param: assume success if we have a snapshot.
    if (order) return 'success'
    return 'unknown'
  }, [searchParams, order])
  const paymentIntentId = order?.paymentIntentId ?? searchParams.get('payment_intent')

  // Clear cart + checkout on successful arrival (defensive — Checkout
  // also clears, but a 3DS roundtrip skips that handler). Also drop the
  // pending-order snapshot from sessionStorage after we're done with it
  // so the page doesn't keep showing the same receipt on later visits.
  useEffect(() => {
    if (outcome === 'success') {
      clearCart()
      clearCheckout()
    }
    if (outcome === 'success' || outcome === 'failed') {
      try { sessionStorage.removeItem('andrequice-pending-order') } catch { /* ignore */ }
    }
  }, [outcome, clearCart, clearCheckout])

  // ── FAILED ──────────────────────────────────────────────────────────────
  if (outcome === 'failed') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-andrequice-copper/15 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-andrequice-copper" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-andrequice-navy">Pagamento não autorizado</h1>
          <p className="text-sm text-andrequice-brown/80">
            Não conseguimos confirmar o pagamento desta vez. Nenhum valor foi cobrado.
            Você pode tentar outro cartão ou outro método.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs mt-3">
            <Button variant="gold" size="lg" fullWidth onClick={() => navigate('/checkout')}>
              Tentar novamente
            </Button>
            <Button variant="outline" size="lg" fullWidth onClick={() => navigate('/cart')}>
              Revisar pedido
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  // ── PROCESSING (boleto, pix etc.) ───────────────────────────────────────
  if (outcome === 'processing') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-andrequice-sand flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-andrequice-brown" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-andrequice-navy">Pagamento em processamento</h1>
          <p className="text-sm text-andrequice-brown/80">
            Aguardando confirmação do seu pagamento. Você receberá um e-mail assim que ele for aprovado.
          </p>
          {paymentIntentId && (
            <p className="text-xs text-andrequice-border font-mono bg-andrequice-sand/50 px-3 py-1.5 rounded-lg">
              Ref: {paymentIntentId.slice(-10).toUpperCase()}
            </p>
          )}
          <Button variant="primary" size="lg" fullWidth className="max-w-xs mt-3" onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </Shell>
    )
  }

  // ── UNKNOWN (direct access, refresh, no context) ────────────────────────
  if (outcome === 'unknown' || !order) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-andrequice-gold/15 flex items-center justify-center">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-andrequice-gold" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-serif text-2xl text-andrequice-navy">Pedido recebido</h1>
          <p className="text-sm text-andrequice-brown/80">
            Você receberá um e-mail de confirmação em instantes com o resumo
            do pedido e o link de acompanhamento.
          </p>
          {paymentIntentId && (
            <p className="text-xs text-andrequice-border font-mono bg-andrequice-sand/50 px-3 py-1.5 rounded-lg">
              Ref: {paymentIntentId.slice(-10).toUpperCase()}
            </p>
          )}
          <Button variant="gold" size="lg" fullWidth className="max-w-xs mt-3" onClick={() => navigate('/catalog')}>
            Continuar comprando
          </Button>
        </div>
      </Shell>
    )
  }

  // ── SUCCESS — full receipt ──────────────────────────────────────────────
  const isPickup = order.deliveryMethod === 'pickup'
  const shippingLine = isPickup
    ? formatShippingLine(order.selectedShipping ?? {}, { isPickup: true })
    : order.selectedShipping
      ? formatShippingLine(order.selectedShipping)
      : null

  const hasMTO = order.items.some((i) => i.fulfillmentMode === 'made_to_order')
  const promisedDateFmt = order.promisedDate && hasMTO
    ? new Date(order.promisedDate + 'T00:00:00').toLocaleDateString('pt-BR')
    : null

  return (
    <Shell>
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-andrequice-gold/15 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-andrequice-gold" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M7 12.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="font-serif text-3xl text-andrequice-navy">Pedido confirmado!</h1>
          <p className="text-sm text-andrequice-brown/80">
            Recebemos seu pagamento com sucesso.
            {order.contact.email && (
              <> Enviamos a confirmação para <strong>{order.contact.email}</strong>.</>
            )}
          </p>
          {paymentIntentId && (
            <p className="text-xs text-andrequice-border font-mono bg-andrequice-sand/50 px-3 py-1.5 rounded-lg">
              Ref: {paymentIntentId.slice(-10).toUpperCase()}
            </p>
          )}
        </div>

        {/* Promised completion banner (only if there's MTO) */}
        {promisedDateFmt && (
          <div className="rounded-2xl bg-andrequice-sand/40 border border-andrequice-sand p-4 flex gap-3">
            <span className="text-2xl leading-none mt-0.5" aria-hidden="true">📦</span>
            <div>
              <p className="font-sans text-sm font-semibold text-andrequice-navy">Prazo de envio</p>
              <p className="font-sans text-sm text-andrequice-brown/80 mt-0.5">
                Seu pedido será preparado e enviado até <strong>{promisedDateFmt}</strong>.
              </p>
              <p className="font-sans text-xs text-andrequice-brown/70 mt-1.5 leading-relaxed">
                Algumas peças são artesanais e feitas sob demanda.
                O prazo da transportadora soma após o envio.
              </p>
            </div>
          </div>
        )}

        {/* Itens */}
        <section className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
          <h2 className="text-xs font-medium uppercase tracking-wide text-andrequice-border mb-3">
            Resumo do pedido
          </h2>

          <ul className="divide-y divide-andrequice-sand">
            {order.items.map((item) => (
              <li key={item.variantId} className="py-3 flex items-start gap-3">
                <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-andrequice-sand">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-andrequice-navy text-sm leading-snug line-clamp-2">
                    {item.name}
                  </p>
                  <p className="text-xs text-andrequice-border mt-0.5">
                    {(() => {
                      const descriptors = formatVariantLine({
                        gender: item.gender,
                        cut:    item.cut,
                        size:   item.size,
                      })
                      return descriptors
                        ? `${descriptors} · ${item.quantity} un.`
                        : `${item.quantity} un.`
                    })()}
                  </p>
                  <div className="mt-1.5">
                    <Badge variant={item.fulfillmentMode === 'made_to_order' ? 'copper' : 'sand'} className="text-[10px]">
                      {item.fulfillmentMode === 'made_to_order' ? 'Sob encomenda' : 'Pronta entrega'}
                    </Badge>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-andrequice-navy tabular-nums">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="text-[11px] text-andrequice-border tabular-nums mt-0.5">
                      {item.quantity}× {formatPrice(item.price)}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Totals */}
          <dl className="mt-3 pt-3 border-t border-andrequice-sand space-y-1.5 text-sm">
            <div className="flex justify-between text-andrequice-brown">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotalCents / 100)}</dd>
            </div>
            <div className="flex justify-between text-andrequice-brown">
              <dt>Frete</dt>
              <dd className="tabular-nums">
                {order.shippingFeeCents > 0 ? formatPrice(order.shippingFeeCents / 100) : 'Grátis'}
              </dd>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-andrequice-sand">
              <dt className="font-sans font-semibold text-andrequice-navy">Total</dt>
              <dd className="font-serif text-lg font-bold text-andrequice-navy tabular-nums">
                {formatPrice(order.totalCents / 100)}
              </dd>
            </div>
            {order.installmentCount && (
              <div className="flex justify-end pt-0.5">
                <dd className="text-xs text-andrequice-brown tabular-nums">
                  {formatInstallmentLabel(order.totalCents, order.installmentCount)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Entrega + Contato (espelha o e-mail) */}
        <section className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 md:divide-x md:divide-andrequice-sand">
            <div className="md:pr-8">
              <h3 className="text-xs font-medium uppercase tracking-wide text-andrequice-border mb-2">
                Contato
              </h3>
              {order.contact.name && (
                <p className="text-sm font-medium text-andrequice-navy">{order.contact.name}</p>
              )}
              {order.contact.email && (
                <p className="text-sm text-andrequice-brown truncate" title={order.contact.email}>
                  {order.contact.email}
                </p>
              )}
              {order.contact.phone && (
                <p className="text-sm text-andrequice-brown">{order.contact.phone}</p>
              )}
            </div>
            <div className="pt-6 md:pt-0 md:pl-8 border-t md:border-t-0 border-andrequice-sand">
              <h3 className="text-xs font-medium uppercase tracking-wide text-andrequice-border mb-2">
                Entrega
              </h3>
              {isPickup ? (
                <p className="text-sm font-medium text-andrequice-navy">Retirada presencial</p>
              ) : order.shippingAddress ? (
                <p className="text-sm text-andrequice-navy">
                  {[
                    `${order.shippingAddress.street}${order.addressExtra.number ? `, ${order.addressExtra.number}` : ''}`,
                    order.addressExtra.complement || null,
                    `${order.shippingAddress.city} - ${order.shippingAddress.state}`,
                    `CEP ${order.shippingAddress.cep}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              ) : null}
              {shippingLine && (
                <>
                  <div className="my-3 border-t border-andrequice-sand" aria-hidden="true" />
                  <p className="text-sm text-andrequice-brown flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-andrequice-border shrink-0" aria-hidden="true">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                    <span>{shippingLine}</span>
                  </p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* What happens next */}
        <section className="bg-andrequice-cream/60 border border-andrequice-sand rounded-2xl p-4 sm:p-5 text-sm text-andrequice-brown leading-relaxed">
          <p>
            Em instantes você receberá um e-mail de <strong>{order.contact.email || 'confirmação'}</strong> com
            todos os detalhes do pedido e um link de acompanhamento. Use esse link para
            visualizar o status, rastreio e — se for o caso — cancelar itens artesanais
            ainda não enviados.
          </p>
        </section>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="gold" size="lg" fullWidth onClick={() => navigate('/catalog')}>
            Continuar comprando
          </Button>
          <Button variant="outline" size="lg" fullWidth onClick={() => navigate('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    </Shell>
  )
}

// Shared shell — header + footer wrap with consistent background
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-andrequice-cream/40 flex flex-col">
      <Header />
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 pb-10 pt-8">
        {children}
      </div>
      <Footer />
    </div>
  )
}

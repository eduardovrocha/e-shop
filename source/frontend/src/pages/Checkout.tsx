import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { Appearance } from '@stripe/stripe-js'
import { getStripe } from '@/lib/stripe'
import { TestModeBanner } from '@/components/TestModeBanner'
import { createPaymentIntent, type PaymentIntentResponse } from '@/services/payments'
import { checkStock } from '@/services/stockService'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { CheckoutStepper } from '@/components/CheckoutStepper'
import { OrderSummary } from '@/components/OrderSummary'
import { CouponInput } from '@/components/CouponInput'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useStore } from '@/hooks/useStore'
import { formatPrice, formatCep, formatPhoneBR } from '@/lib/utils'
import { formatShippingLine } from '@/utils/shipping'
import { InstallmentSelector } from '@/components/InstallmentSelector'
import type { InstallmentCount } from '@/utils/installments'

// ── Stripe Appearance ─────────────────────────────────────────────────────────

const appearance: Appearance = {
  theme: 'flat',
  variables: {
    colorPrimary: '#D4A261',
    colorBackground: '#FFFFFF',
    colorText: '#4A2E1A',
    colorDanger: '#B86E2E',
    colorTextSecondary: '#A8947D',
    colorTextPlaceholder: '#A8947D',
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSizeSm: '14px',
    fontSizeBase: '16px',
    borderRadius: '12px',
    gridRowSpacing: '16px',
    gridColumnSpacing: '12px',
    spacingUnit: '4px',
  },
  rules: {
    '.Input': { border: '1px solid #A8947D', boxShadow: 'none', padding: '12px 16px', backgroundColor: '#FFFFFF' },
    '.Input:focus': { border: '1px solid #D4A261', boxShadow: '0 0 0 3px rgba(212, 162, 97, 0.15)' },
    '.Input--invalid': { border: '1px solid #B86E2E' },
    '.Label': { color: '#4A2E1A', fontWeight: '500', fontSize: '14px', marginBottom: '6px' },
    '.Error': { color: '#B86E2E', fontSize: '13px', marginTop: '10px' },
    '.Tab': { border: '1px solid #A8947D', borderRadius: '12px', boxShadow: 'none' },
    '.Tab--selected': { border: '2px solid #D4A261', backgroundColor: 'rgba(212, 162, 97, 0.05)' },
    '.Tab:hover': { border: '1px solid #D4A261' },
  },
}

// ── Payment section (must live inside <Elements>) ─────────────────────────────

function PaymentSection({
  intent,
  customerName,
  customerEmail,
  customerPhone,
  installmentCount,
  onInstallmentCountChange,
  onSuccess,
}: {
  intent: PaymentIntentResponse
  customerName: string
  customerEmail: string
  customerPhone: string
  installmentCount: InstallmentCount
  onInstallmentCountChange: (count: InstallmentCount) => void
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [confirming, setConfirming] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setConfirming(true)
    setPaymentError(null)

    // Stripe's installments.plan is only sent when count >= 2 — keeps the
    // 1x payload byte-equivalent to the pre-installments flow (regression
    // zero on à-vista). Loja absorve o custo: total enviado é idêntico.
    const paymentMethodOptions = installmentCount === 1
      ? undefined
      : {
          card: {
            installments: {
              plan: {
                count: installmentCount,
                interval: 'month' as const,
                type: 'fixed_count' as const,
              },
            },
          },
        }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pedido-confirmado`,
        payment_method_data: {
          billing_details: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
        },
        ...(paymentMethodOptions && { payment_method_options: paymentMethodOptions }),
      },
      redirect: 'if_required',
    })

    if (error) {
      const rawMessage = error.message ?? ''
      const isInstallmentsUnsupported =
        error.code === 'installments_plan_not_available' ||
        /installment/i.test(rawMessage)

      if (isInstallmentsUnsupported) {
        setPaymentError(
          `Este cartão não permite parcelamento em ${installmentCount}x. ` +
          'Selecione outra quantidade de parcelas ou utilize outro cartão.'
        )
      } else {
        setPaymentError(
          error.code === 'card_declined'
            ? 'Pagamento recusado. Verifique os dados do cartão ou tente outro método.'
            : rawMessage || 'Erro ao processar pagamento. Tente novamente.'
        )
      }
      setConfirming(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setConfirming(false)
    }
  }

  const promisedDate = intent.aggregated_promised_completion_date
    ? new Date(intent.aggregated_promised_completion_date + 'T00:00:00')
    : null
  const todayIso = new Date().toISOString().slice(0, 10)
  const showPromised = promisedDate && intent.aggregated_promised_completion_date !== todayIso

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="font-serif text-lg font-semibold text-andrequice-navy leading-tight">
          Forma de pagamento
        </h2>
        <p className="text-xs text-andrequice-border mt-0.5">
          Pagamento processado com segurança via Stripe.
        </p>
      </header>

      {showPromised && promisedDate && (
        <div className="mb-4 rounded-xl bg-andrequice-sand/40 border border-andrequice-sand p-3 flex gap-2.5">
          <span className="text-lg leading-none mt-0.5" aria-hidden="true">📦</span>
          <div>
            <p className="font-sans text-sm font-semibold text-andrequice-navy">Prazo de envio</p>
            <p className="font-sans text-xs text-andrequice-brown mt-0.5">
              Seu pedido será preparado e enviado até{' '}
              <strong>{promisedDate.toLocaleDateString('pt-BR')}</strong>.
            </p>
          </div>
        </div>
      )}

      <InstallmentSelector
        totalCents={intent.total_cents}
        value={installmentCount}
        onChange={onInstallmentCountChange}
        disabled={confirming}
      />

      <PaymentElement
        options={{
          layout: { type: 'tabs', defaultCollapsed: false },
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />

      {paymentError && (
        <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-andrequice-copper/10 border border-andrequice-copper/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-andrequice-copper mt-0.5 flex-shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          <p className="text-sm text-andrequice-copper">{paymentError}</p>
        </div>
      )}

      <Button
        type="submit"
        variant="gold"
        size="lg"
        fullWidth
        loading={confirming}
        disabled={!stripe || !elements}
        className="mt-4"
      >
        {confirming ? 'Processando...' : `Pagar ${formatPrice(intent.total_cents / 100)}`}
      </Button>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clearCart } = useCartStore()
  const appliedCoupon = useCartStore((s) => s.appliedCoupon)
  const removeCoupon  = useCartStore((s) => s.removeCoupon)
  const {
    deliveryMethod, selectedShipping, shippingAddress, contact, addressExtra,
  } = useCheckoutStore()
  const { store } = useStore()

  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [installmentCount, setInstallmentCount] = useState<InstallmentCount>(1)
  const paymentRef = useRef<HTMLDivElement>(null)

  // ── Guards: empty cart → /catalog, missing required data → /cart ────────
  useEffect(() => {
    // Once a PaymentIntent has been created, the cart can legitimately go
    // empty after confirmPayment succeeds (handleSuccess clears it before
    // navigating to /pedido-confirmado). Skipping the guard prevents the
    // redirect from racing the success navigation.
    if (intent) return
    if (items.length === 0) {
      navigate('/catalog', { replace: true })
      return
    }
    // Required data collected in /cart:
    const missingContact =
      !contact.email || !contact.name || !contact.phone
    const missingDelivery =
      deliveryMethod === 'delivery' &&
      (!shippingAddress?.cep || !selectedShipping || !addressExtra.number)
    if (missingContact || missingDelivery) {
      navigate('/cart', { replace: true })
    }
  }, [intent, items.length, contact, deliveryMethod, shippingAddress, selectedShipping, addressExtra, navigate])

  // ── Derived totals ──────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shippingFee = deliveryMethod === 'pickup' ? 0 : (selectedShipping?.priceCents ?? 0) / 100

  const aggregatedLeadTimeDays = useMemo(() =>
    items.reduce<number>((acc, i) => {
      if (i.fulfillmentMode !== 'made_to_order' || i.productionLeadTimeDays == null) return acc
      return Math.max(acc, i.productionLeadTimeDays)
    }, 0),
  [items])
  const promisedLabel = aggregatedLeadTimeDays > 0
    ? `Pronto para envio em até ${aggregatedLeadTimeDays} dias após o pagamento.`
    : null

  // ── Create payment intent on mount (once data is validated) ─────────────
  //
  // Guarded by a ref so React strict-mode double-invocation or any unrelated
  // re-render does not retrigger the request. We deliberately don't include
  // `loading` in deps — setting it inside the effect would cause a cleanup
  // that cancels the inflight request before setIntent runs, leaving the
  // UI stuck on "Preparando pagamento seguro...".
  const intentRequestedRef = useRef(false)
  useEffect(() => {
    if (intentRequestedRef.current) return
    if (intent || items.length === 0) return
    if (deliveryMethod === 'delivery' && !selectedShipping) return
    if (!contact.email || !contact.name || !contact.phone) return

    intentRequestedRef.current = true
    setLoading(true)
    setServerError(null)

    ;(async () => {
      try {
        const stockResults = await checkStock(
          items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity }))
        )
        const failed = stockResults.filter((r) => !r.valid)
        if (failed.length > 0) {
          setServerError(
            failed.map((r) => r.message).filter(Boolean).join(' · ') ||
            'A quantidade solicitada não está mais disponível. Ajuste seu carrinho.'
          )
          intentRequestedRef.current = false
          return
        }

        const newIntent = await createPaymentIntent({
          items: items.map((i) => ({ id: i.id, variant_id: i.variantId, size: i.size, quantity: i.quantity })),
          delivery_method: deliveryMethod,
          customer_name:   contact.name,
          customer_email:  contact.email,
          customer_phone:  contact.phone,
          shipping_address: deliveryMethod === 'delivery' && shippingAddress
            ? {
                cep:        shippingAddress.cep,
                city:       shippingAddress.city,
                state:      shippingAddress.state,
                address:    shippingAddress.street,
                number:     addressExtra.number,
                complement: addressExtra.complement,
              }
            : null,
          ...(deliveryMethod === 'delivery' && {
            shipping_cep:        shippingAddress?.cep.replace(/\D/g, '') ?? '',
            shipping_service_id: selectedShipping?.serviceId,
          }),
          // Coupon code (if any). Backend re-validates under lock and
          // reserves the slot against the new PaymentIntent id. If the
          // coupon went stale between the layer-2 validation and now,
          // the backend returns 422 — we surface it and drop the coupon.
          ...(appliedCoupon && { coupon_code: appliedCoupon.code }),
        })
        setIntent(newIntent)
      } catch (err: unknown) {
        const axiosError = err as { response?: { data?: { error?: string } } }
        const errMsg = axiosError?.response?.data?.error ?? 'Não foi possível iniciar o pagamento. Tente novamente.'
        // If the backend rejected the coupon at this final step, drop it
        // so the buyer doesn't get stuck retrying with a dead coupon.
        if (/cupom/i.test(errMsg)) removeCoupon()
        setServerError(errMsg)
        // Allow a retry attempt (e.g. user refreshes or comes back)
        intentRequestedRef.current = false
      } finally {
        setLoading(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, deliveryMethod, contact, shippingAddress, addressExtra, selectedShipping])

  // ── Scroll into payment section once intent is ready ────────────────────
  useEffect(() => {
    if (!intent || !paymentRef.current) return
    const t = setTimeout(() =>
      paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    , 150)
    return () => clearTimeout(t)
  }, [intent])

  // Persist a pending-order snapshot the moment we have an intent. Stripe
  // 3DS confirmation redirects out of the SPA — when the browser comes
  // back to /pedido-confirmado?redirect_status=succeeded, location.state
  // is gone, and we recover the receipt data from sessionStorage.
  useEffect(() => {
    if (!intent) return
    const snapshot = {
      paymentIntentId: intent.client_secret?.split('_secret_')[0] ?? null,
      totalCents:        intent.total_cents,
      subtotalCents:     intent.items_total_cents,
      shippingFeeCents:  intent.shipping_fee_cents,
      promisedDate:      intent.aggregated_promised_completion_date ?? null,
      installmentCount,
      deliveryMethod,
      contact: { ...contact },
      shippingAddress: shippingAddress ? { ...shippingAddress } : null,
      addressExtra: { ...addressExtra },
      selectedShipping: selectedShipping ? { ...selectedShipping } : null,
      items: items.map((i) => ({ ...i })),
    }
    try {
      sessionStorage.setItem('andrequice-pending-order', JSON.stringify(snapshot))
    } catch {
      /* storage full or unavailable — fall back to location.state path */
    }
  }, [intent, items, deliveryMethod, contact, shippingAddress, addressExtra, selectedShipping, installmentCount])

  const handleSuccess = useCallback(() => {
    // In-element confirmation (no 3DS redirect): pull the snapshot we just
    // saved and pass it through location.state for the happy path.
    let snapshot: unknown = null
    try {
      const raw = sessionStorage.getItem('andrequice-pending-order')
      if (raw) snapshot = JSON.parse(raw)
    } catch { /* ignore */ }
    clearCart()
    navigate('/pedido-confirmado', snapshot ? { state: { order: snapshot } } : undefined)
  }, [clearCart, navigate])

  // ── Empty / redirect placeholder ────────────────────────────────────────
  if (items.length === 0) return null

  // ── Recap data for the "Entrega e contato" card ─────────────────────────
  // Each subfield is rendered in its own JSX node — no string concatenation
  // at this layer to avoid bugs like "81Uberlândia" or "CEPRetirada".

  const isPickup = deliveryMethod === 'pickup'
  const shippingLine = isPickup
    ? formatShippingLine(selectedShipping ?? {}, { isPickup: true })
    : selectedShipping
      ? formatShippingLine(selectedShipping)
      : null

  return (
    <div className="min-h-screen bg-andrequice-cream/40 flex flex-col">
      <TestModeBanner />
      <Header showBack />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 w-full flex flex-col gap-6">
        {/* Top bar */}
        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => navigate('/cart')}
            className="inline-flex items-center gap-1.5 text-andrequice-brown hover:text-andrequice-navy transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Voltar para revisar pedido
          </button>
          <span className="inline-flex items-center gap-1.5 text-andrequice-border">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Compra segura
          </span>
        </div>

        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-andrequice-navy">
          Pagamento
        </h1>

        <CheckoutStepper currentStep={2} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
          {/* Left: recap + payment */}
          <div className="flex flex-col gap-4">
            {/* Recap card — two-column layout in desktop, stacked in mobile.
                 Each field is its own <p> so display:block is intrinsic and
                 we can't accidentally concatenate strings. */}
            <section className="bg-white rounded-2xl shadow-soft p-5 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 md:divide-x md:divide-andrequice-sand">
                {/* CONTATO */}
                <div className="md:pr-8">
                  <header className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-andrequice-border">
                      Contato
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/cart')}
                      className="text-xs text-andrequice-gold hover:text-andrequice-copper transition-colors"
                    >
                      Editar
                    </button>
                  </header>
                  {contact.name && (
                    <p className="text-sm font-medium text-andrequice-navy">{contact.name}</p>
                  )}
                  {contact.email && (
                    <p
                      className="text-sm text-andrequice-brown truncate"
                      title={contact.email}
                    >
                      {contact.email}
                    </p>
                  )}
                  {contact.phone && (
                    <p className="text-sm text-andrequice-brown">
                      {formatPhoneBR(contact.phone)}
                    </p>
                  )}
                </div>

                {/* ENTREGA */}
                <div className="pt-6 md:pt-0 md:pl-8 border-t md:border-t-0 border-andrequice-sand">
                  <header className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-andrequice-border">
                      Entrega
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/cart')}
                      className="text-xs text-andrequice-gold hover:text-andrequice-copper transition-colors"
                    >
                      Editar
                    </button>
                  </header>

                  {isPickup ? (
                    <>
                      <p className="text-sm font-medium text-andrequice-navy">
                        Retirada presencial
                      </p>
                      {store?.pickup_street && (
                        <>
                          <p className="text-sm text-andrequice-brown">
                            {store.pickup_street}
                            {store.pickup_number ? `, ${store.pickup_number}` : ''}
                          </p>
                          {store.pickup_complement && (
                            <p className="text-sm text-andrequice-brown">
                              {store.pickup_complement}
                            </p>
                          )}
                          {(store.pickup_city || store.pickup_state) && (
                            <p className="text-sm text-andrequice-brown">
                              {store.pickup_city}
                              {store.pickup_city && store.pickup_state ? ' - ' : ''}
                              {store.pickup_state}
                            </p>
                          )}
                        </>
                      )}
                    </>
                  ) : shippingAddress ? (
                    <p className="text-sm text-andrequice-navy">
                      {[
                        `${shippingAddress.street}${addressExtra.number ? `, ${addressExtra.number}` : ''}`,
                        addressExtra.complement || null,
                        shippingAddress.city && shippingAddress.state
                          ? `${shippingAddress.city} - ${shippingAddress.state}`
                          : (shippingAddress.city || shippingAddress.state || null),
                        shippingAddress.cep ? `CEP ${formatCep(shippingAddress.cep)}` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}

                  {shippingLine && (
                    <>
                      <div className="my-3 border-t border-andrequice-sand" aria-hidden="true" />
                      <p className="text-sm text-andrequice-brown flex items-center gap-2">
                        <svg
                          width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round"
                          className="text-andrequice-border shrink-0"
                          aria-hidden="true"
                        >
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

            {/* Payment */}
            {loading && !intent && (
              <div className="bg-white rounded-2xl shadow-soft p-5 sm:p-6 text-center">
                <p className="text-sm text-andrequice-border">Preparando pagamento seguro...</p>
              </div>
            )}

            {serverError && !intent && (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-andrequice-copper/10 border border-andrequice-copper/30">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-andrequice-copper mt-0.5 flex-shrink-0" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                </svg>
                <p className="text-sm text-andrequice-copper">{serverError}</p>
              </div>
            )}

            {intent && (
              <div ref={paymentRef}>
                <Elements
                  stripe={getStripe()}
                  options={{ clientSecret: intent.client_secret, appearance, locale: 'pt-BR' }}
                >
                  <PaymentSection
                    intent={intent}
                    customerName={contact.name}
                    customerEmail={contact.email}
                    customerPhone={contact.phone}
                    installmentCount={installmentCount}
                    onInstallmentCountChange={setInstallmentCount}
                    onSuccess={handleSuccess}
                  />
                </Elements>
              </div>
            )}
          </div>

          {/* Right: sticky order summary */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              promisedCompletionDate={promisedLabel}
              installmentCount={intent ? installmentCount : undefined}
              discount={appliedCoupon ? appliedCoupon.discountCents / 100 : null}
              couponCode={appliedCoupon?.code ?? null}
              eligibleProductIds={appliedCoupon?.eligibleProductIds ?? []}
              beforeTotals={!intent ? <CouponInput /> : null}
            />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  )
}

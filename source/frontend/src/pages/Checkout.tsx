import { useState, useCallback, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import type { Appearance } from '@stripe/stripe-js'
import { z } from 'zod'
import { stripePromise } from '@/lib/stripe'
import { createPaymentIntent, type PaymentIntentResponse } from '@/services/payments'
import { checkStock } from '@/services/stockService'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { MobileBottomBar } from '@/components/MobileBottomBar'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { PriceTag } from '@/components/PriceTag'
import { SectionTitle } from '@/components/SectionTitle'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useStore } from '@/hooks/useStore'
import { formatCep, formatPrice } from '@/lib/utils'

type DeliveryMethod = 'delivery' | 'pickup'

interface FormState {
  name: string
  phone: string
  email: string
  cep: string
  city: string
  state: string
  address: string
  number: string
  complement: string
}

type FormErrors = Partial<Record<keyof FormState | 'terms', string>>

// ── Zod schemas ───────────────────────────────────────────────────────────────

const baseSchema = z.object({
  name: z.string().min(3, 'Informe seu nome completo'),
  phone: z.string().refine(
    (v) => v.replace(/\D/g, '').length >= 10,
    'Telefone inválido (ex: (38) 99999-9999)'
  ),
  email: z.string().email('E-mail inválido'),
})

const deliverySchema = baseSchema.extend({
  cep: z.string().regex(/^\d{5}-\d{3}$/, 'CEP inválido (ex: 12345-678)'),
  city: z.string().min(2, 'Informe a cidade'),
  state: z.string().length(2, 'Use a sigla do estado (ex: MG)'),
  address: z.string().min(3, 'Informe o logradouro'),
  number: z.string().min(1, 'Informe o número'),
  complement: z.string().optional(),
})

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="text-xs text-andrequice-copper mt-1">{msg}</p>
}

function AccordionSection({
  title,
  open,
  onToggle,
  summary,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  summary?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left gap-3"
      >
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border">
            {title}
          </span>
          {!open && summary && (
            <span className="text-sm text-andrequice-navy font-medium leading-snug truncate">
              {summary}
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="flex-shrink-0 text-andrequice-border"
          style={{
            transition: 'transform 0.3s ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={[
          'grid transition-[grid-template-rows] duration-300 ease-in-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        ].join(' ')}
      >
        <div className="overflow-hidden">
          <div className="border-t border-andrequice-sand px-4 pt-4 pb-5 flex flex-col gap-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Payment section (must live inside <Elements>) ─────────────────────────────

function PaymentSection({
  intent,
  customerName,
  customerEmail,
  customerPhone,
  onSuccess,
  onBack,
}: {
  intent: PaymentIntentResponse
  customerName: string
  customerEmail: string
  customerPhone: string
  onSuccess: () => void
  onBack: () => void
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
      },
      redirect: 'if_required',
    })

    if (error) {
      setPaymentError(
        error.code === 'card_declined'
          ? 'Pagamento recusado. Verifique os dados do cartão ou tente outro método.'
          : error.message ?? 'Erro ao processar pagamento. Tente novamente.'
      )
      setConfirming(false)
    } else if (paymentIntent?.status === 'succeeded') {
      onSuccess()
    } else {
      setConfirming(false)
    }
  }

  // Format aggregated promised date (only meaningful when there are made_to_order
  // items in the cart; backend returns today's date for purely from_stock orders).
  const promisedDate = intent.aggregated_promised_completion_date
    ? new Date(intent.aggregated_promised_completion_date + 'T00:00:00')
    : null
  const todayIso = new Date().toISOString().slice(0, 10)
  const showPromised = promisedDate && intent.aggregated_promised_completion_date !== todayIso

  return (
    <form onSubmit={handleSubmit} noValidate>
      {showPromised && promisedDate && (
        <div className="bg-andrequice-sand/40 border border-andrequice-sand rounded-2xl p-4 mb-4 flex gap-3">
          <span className="text-xl leading-none mt-0.5">📦</span>
          <div className="flex-1">
            <p className="font-sans text-sm font-semibold text-andrequice-navy">Prazo de envio</p>
            <p className="font-sans text-sm text-andrequice-brown mt-0.5">
              Seu pedido será preparado e enviado até{' '}
              <strong>{promisedDate.toLocaleDateString('pt-BR')}</strong>.
            </p>
            <p className="font-sans text-xs text-andrequice-brown/70 mt-1.5 leading-relaxed">
              Itens artesanais são feitos sob demanda. O prazo da transportadora soma após o envio.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden shadow-soft">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-andrequice-sand">
          <span className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border">
            Método de Pagamento
          </span>
          <button
            type="button"
            onClick={onBack}
            disabled={confirming}
            className="text-xs text-andrequice-gold hover:text-andrequice-copper transition-colors disabled:opacity-50"
          >
            Alterar dados
          </button>
        </div>
        <div className="p-4">
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
        </div>
      </div>

      <MobileBottomBar>
        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            variant="gold"
            size="lg"
            fullWidth
            loading={confirming}
            disabled={!stripe || !elements}
          >
            {confirming ? 'Processando...' : `Pagar ${formatPrice(intent.total_cents / 100)}`}
          </Button>
          <button
            type="button"
            onClick={onBack}
            disabled={confirming}
            className="text-xs text-andrequice-border text-center w-full py-1 disabled:opacity-50"
          >
            Voltar e editar dados
          </button>
        </div>
      </MobileBottomBar>
    </form>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clearCart } = useCartStore()
  const { deliveryMethod, selectedShipping, shippingAddress } = useCheckoutStore()
  const { store } = useStore()
  const delivery: DeliveryMethod = deliveryMethod

  // ── Form state ───────────────────────────────────────────────────────────────

  const [form, setForm] = useState<FormState>({
    name: '', phone: '', email: '',
    cep:     shippingAddress?.cep    ?? '',
    city:    shippingAddress?.city   ?? '',
    state:   shippingAddress?.state  ?? '',
    address: shippingAddress?.street ?? '',
    number: '',
    complement: '',
  })
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  // ── Accordion + payment state ─────────────────────────────────────────────

  const [intent, setIntent] = useState<PaymentIntentResponse | null>(null)
  const [personalOpen, setPersonalOpen] = useState(true)
  const [addressOpen, setAddressOpen] = useState(true)
  const paymentRef = useRef<HTMLDivElement>(null)

  // Pre-fill address fields from checkout store (set in /cart via ViaCEP)
  useEffect(() => {
    if (!shippingAddress) return
    setForm((prev) => ({
      ...prev,
      cep:     shippingAddress.cep,
      city:    shippingAddress.city,
      state:   shippingAddress.state,
      address: prev.address || shippingAddress.street,
    }))
  }, [shippingAddress])

  // Smooth scroll into payment block when it appears
  useEffect(() => {
    if (!intent || !paymentRef.current) return
    const timer = setTimeout(
      () => paymentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
      150
    )
    return () => clearTimeout(timer)
  }, [intent])

  // ── Field helpers ─────────────────────────────────────────────────────────

  const update = useCallback(
    (field: keyof FormState) => (value: string) =>
      setForm((prev) => ({ ...prev, [field]: value })),
    []
  )

  const handlePhoneChange = useCallback((value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11)
    const masked =
      d.length <= 2 ? d :
      d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` :
      d.length <= 10
        ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
        : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    setForm((prev) => ({ ...prev, phone: masked }))
  }, [])

  // ── Dynamic button enablement ─────────────────────────────────────────────

  const canProceed = useMemo(() => {
    const nameOk    = form.name.trim().length >= 3
    const phoneOk   = form.phone.replace(/\D/g, '').length >= 10
    const emailOk   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    const base      = nameOk && phoneOk && emailOk && termsAccepted

    if (delivery === 'pickup') return base

    const cepOk     = /^\d{5}-\d{3}$/.test(form.cep)
    const cityOk    = form.city.trim().length >= 2
    const stateOk   = form.state.trim().length === 2
    const addressOk = form.address.trim().length >= 3
    const numberOk  = form.number.trim().length >= 1

    return base && cepOk && cityOk && stateOk && addressOk && numberOk
  }, [form, termsAccepted, delivery])

  // ── Derived display values ────────────────────────────────────────────────

  const subtotal    = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shippingFee = delivery === 'pickup' ? 0 : (selectedShipping?.priceCents ?? 0) / 100

  const shippingLabel =
    delivery === 'pickup'
      ? 'Retirada presencial'
      : selectedShipping
        ? `${selectedShipping.carrier} — ${selectedShipping.service}`
        : '—'

  const pickupCity = store?.pickup_city ? `${store.pickup_city} - ${store.pickup_state}` : 'Local a confirmar'

  const shippingSubLabel =
    delivery === 'pickup'
      ? `Grátis · ${pickupCity}`
      : selectedShipping
        ? `${
            selectedShipping.deliveryDays > 0
              ? `${selectedShipping.deliveryDays} dia${selectedShipping.deliveryDays !== 1 ? 's' : ''} útei${selectedShipping.deliveryDays !== 1 ? 's' : 'l'}`
              : 'Retirada'
          } · ${selectedShipping.priceCents === 0 ? 'Grátis' : formatPrice(selectedShipping.priceCents / 100)}`
        : ''

  const personalSummary = [form.name, form.phone].filter(Boolean).join(' · ')
  const addressSummary  = form.address
    ? `${form.address}${form.number ? `, ${form.number}` : ''} · ${form.city}`
    : ''

  // ── Proceed to payment ────────────────────────────────────────────────────

  const handleProceed = async () => {
    const schema = delivery === 'delivery' ? deliverySchema : baseSchema
    const result = schema.safeParse(form)
    const newErrors: FormErrors = {}

    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof FormState
        if (!newErrors[field]) newErrors[field] = issue.message
      })
    }
    if (!termsAccepted) newErrors.terms = 'Você precisa aceitar os termos para continuar'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      setPersonalOpen(true)
      if (delivery === 'delivery') setAddressOpen(true)
      return
    }

    setErrors({})
    setLoading(true)
    setServerError(null)

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
        setLoading(false)
        return
      }

      const newIntent = await createPaymentIntent({
        items: items.map((i) => ({ id: i.id, variant_id: i.variantId, size: i.size, quantity: i.quantity })),
        delivery_method: delivery,
        customer_name:   form.name,
        customer_email:  form.email,
        customer_phone:  form.phone,
        shipping_address: delivery === 'delivery'
          ? { cep: form.cep, city: form.city, state: form.state, address: form.address, number: form.number, complement: form.complement }
          : null,
        ...(delivery === 'delivery' && {
          shipping_cep:        form.cep.replace(/\D/g, ''),
          shipping_service_id: selectedShipping?.serviceId,
        }),
      })

      setPersonalOpen(false)
      setAddressOpen(false)
      setIntent(newIntent)
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } }
      setServerError(axiosError?.response?.data?.error ?? 'Não foi possível iniciar o pagamento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = useCallback(() => {
    setIntent(null)
    setPersonalOpen(true)
    if (delivery === 'delivery') setAddressOpen(true)
  }, [delivery])

  const handleSuccess = useCallback(() => {
    clearCart()
    navigate('/pedido-confirmado')
  }, [clearCart, navigate])

  // ── Empty cart guard ──────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack />
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
          <p className="font-serif text-xl text-andrequice-navy mb-4">Carrinho vazio</p>
          <Button variant="primary" onClick={() => navigate('/catalog')}>Ver Catálogo</Button>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack />

      <div className="max-w-6xl mx-auto px-4 pb-10 pt-8 w-full flex flex-col gap-4">
        <SectionTitle title="Finalizar Pedido" />

        {/* ── 1. Método de Entrega (read-only) ──────────────────────────── */}
        <div className="flex flex-col">
          <div className={[
            'flex items-center justify-between gap-4 border-2 border-andrequice-gold bg-andrequice-gold/5 p-4',
            delivery === 'pickup' && store?.pickup_street
              ? 'rounded-t-2xl border-b-0'
              : 'rounded-2xl',
          ].join(' ')}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-5 h-5 rounded-full border-2 border-andrequice-gold flex items-center justify-center flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-andrequice-gold" />
              </div>
              <div className="min-w-0">
                <p className="font-sans font-medium text-andrequice-navy text-sm">{shippingLabel}</p>
                <p className="font-sans text-xs text-andrequice-border">{shippingSubLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              className="shrink-0 flex items-center gap-1 text-sm text-andrequice-gold hover:text-andrequice-copper transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Alterar
            </button>
          </div>
          {delivery === 'pickup' && store?.pickup_street && (
            <div className="border-2 border-t-0 border-andrequice-gold bg-andrequice-gold/5 rounded-b-2xl px-4 pb-4 pt-3">
              <p className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border mb-1.5">
                Local de retirada
              </p>
              <p className="font-sans text-sm text-andrequice-navy">
                {store.pickup_street}{store.pickup_number ? `, ${store.pickup_number}` : ''}
                {store.pickup_complement ? ` — ${store.pickup_complement}` : ''}
              </p>
              <p className="font-sans text-xs text-andrequice-border mt-0.5">
                {store.pickup_city} - {store.pickup_state}
                {store.pickup_zipcode ? `, CEP ${store.pickup_zipcode}` : ''}
              </p>
            </div>
          )}
        </div>

        {/* ── 2. Seus Dados (collapsible) ───────────────────────────────── */}
        <AccordionSection
          title="Seus Dados"
          open={personalOpen}
          onToggle={() => setPersonalOpen((v) => !v)}
          summary={personalSummary}
        >
          <div>
            <Input
              label="Nome completo"
              value={form.name}
              onChange={update('name')}
              placeholder="João da Silva"
              required
            />
            <FieldError msg={errors.name} />
          </div>
          <div>
            <Input
              label="Telefone / WhatsApp"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="(38) 99999-9999"
              type="tel"
              inputMode="numeric"
              maxLength={15}
              required
            />
            <FieldError msg={errors.phone} />
          </div>
          <div>
            <Input
              label="E-mail"
              value={form.email}
              onChange={update('email')}
              placeholder="joao@email.com"
              type="email"
              inputMode="email"
              required
            />
            <FieldError msg={errors.email} />
          </div>
        </AccordionSection>

        {/* ── 3. Endereço de Entrega (collapsible, somente delivery) ───── */}
        {delivery === 'delivery' && (
          <AccordionSection
            title="Endereço de Entrega"
            open={addressOpen}
            onToggle={() => setAddressOpen((v) => !v)}
            summary={addressSummary}
          >
            <div>
              <Input
                label="CEP"
                value={form.cep}
                onChange={(v) => update('cep')(formatCep(v))}
                placeholder="00000-000"
                inputMode="numeric"
                required
                disabled
              />
              <FieldError msg={errors.cep} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Cidade"
                  value={form.city}
                  onChange={update('city')}
                  placeholder="Curvelo"
                  required
                  disabled
                />
                <FieldError msg={errors.city} />
              </div>
              <div>
                <Input
                  label="UF"
                  value={form.state}
                  onChange={(v) => update('state')(v.toUpperCase().slice(0, 2))}
                  placeholder="MG"
                  required
                  disabled
                />
                <FieldError msg={errors.state} />
              </div>
            </div>
            <div>
              <Input
                label="Endereço"
                value={form.address}
                onChange={update('address')}
                placeholder="Rua, Avenida..."
                required
                disabled
              />
              <FieldError msg={errors.address} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Input
                  label="Número"
                  value={form.number}
                  onChange={update('number')}
                  placeholder="123"
                  required
                />
                <FieldError msg={errors.number} />
              </div>
              <div className="col-span-2">
                <Input
                  label="Complemento"
                  value={form.complement}
                  onChange={update('complement')}
                  placeholder="Apto, Bloco..."
                />
              </div>
            </div>
          </AccordionSection>
        )}

        {/* ── Termos (oculto após intent criado) ───────────────────────── */}
        {!intent && (
          <div className="flex flex-col gap-1 px-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-andrequice-border accent-andrequice-gold"
              />
              <span className="text-sm text-andrequice-brown">
                Concordo com a{' '}
                <span className="text-andrequice-gold underline cursor-pointer">política de privacidade</span>
                {' '}e autorizo o uso dos meus dados para processamento do pedido e contato via WhatsApp.
              </span>
            </label>
            {errors.terms && (
              <p className="text-xs text-andrequice-copper pl-7">{errors.terms}</p>
            )}
          </div>
        )}

        {/* ── 4. Método de Pagamento (aparece após intent) ──────────────── */}
        {intent && stripePromise && (
          <div ref={paymentRef}>
            <Elements
              stripe={stripePromise}
              options={{ clientSecret: intent.client_secret, appearance, locale: 'pt-BR' }}
            >
              <PaymentSection
                intent={intent}
                customerName={form.name}
                customerEmail={form.email}
                customerPhone={form.phone}
                onSuccess={handleSuccess}
                onBack={handleBack}
              />
            </Elements>
          </div>
        )}

        {/* ── 5. Resumo do Pedido (sempre visível) ─────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-soft flex flex-col">
          <div className="px-4 py-3.5 border-b border-andrequice-sand">
            <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border">
              Resumo do Pedido
            </h2>
          </div>

          {items.map((item, idx) => (
            <div
              key={item.variantId}
              className={[
                'flex items-center gap-3 px-4 py-3',
                idx < items.length - 1 ? 'border-b border-andrequice-sand' : '',
              ].join(' ')}
            >
              <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-andrequice-sand">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-andrequice-border">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-semibold text-andrequice-navy text-sm leading-snug line-clamp-1">
                  {item.name}
                </p>
                <p className="text-xs text-andrequice-border mt-0.5">
                  Tam. {item.size} · Qtd. {item.quantity}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-andrequice-navy">
                  {formatPrice(item.price * item.quantity)}
                </p>
                {item.quantity > 1 && (
                  <p className="text-[11px] text-andrequice-border tabular-nums">
                    {item.quantity}× {formatPrice(item.price)}
                  </p>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-2 px-4 py-3 border-t border-andrequice-sand">
            <div className="flex justify-between text-sm text-andrequice-brown">
              <span>Frete</span>
              <span>{shippingFee > 0 ? formatPrice(shippingFee) : 'Grátis'}</span>
            </div>
            <div className="h-px bg-andrequice-sand" />
            <div className="flex justify-between items-center">
              <span className="font-sans font-semibold text-andrequice-navy">Total estimado</span>
              <PriceTag value={subtotal + shippingFee} size="lg" />
            </div>
          </div>
        </div>

        {/* ── Server error ──────────────────────────────────────────────── */}
        {serverError && !intent && (
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-andrequice-copper/10 border border-andrequice-copper/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-andrequice-copper mt-0.5 flex-shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1" fill="currentColor" />
            </svg>
            <p className="text-sm text-andrequice-copper">{serverError}</p>
          </div>
        )}
      </div>

      <Footer />

      {/* ── Bottom bar: visível enquanto não há intent ────────────────────── */}
      {!intent && (
        <MobileBottomBar>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="font-sans text-xs text-andrequice-border">Total estimado</span>
              <PriceTag value={subtotal + shippingFee} size="md" />
            </div>
            <Button
              type="button"
              variant="gold"
              size="lg"
              fullWidth
              loading={loading}
              disabled={!canProceed || loading}
              onClick={handleProceed}
            >
              {loading ? 'Aguarde...' : 'Ir para o Pagamento'}
            </Button>
            <p className="text-center text-xs text-andrequice-border mt-0.5">
              Pagamento seguro via Stripe
            </p>
          </div>
        </MobileBottomBar>
      )}
    </div>
  )
}

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Badge } from '@/components/Badge'
import { OrderSummary } from '@/components/OrderSummary'
import { CheckoutAccordion, type AccordionStepDef } from '@/components/CheckoutAccordion'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useStore } from '@/hooks/useStore'
import { formatCep, formatPrice } from '@/lib/utils'
import { formatShippingLine } from '@/utils/shipping'
import api from '@/services/api'
import { checkStock } from '@/services/stockService'

interface ShippingOption {
  provider: string
  service_id: number
  carrier: string
  service: string
  price_cents: number
  delivery_days: number
}

// ── Cart line item — same data contract as the previous version,
// adapted to the wider, white-card layout used inside the accordion.

function LineItem({
  variantId, name, size, price, quantity, imageUrl, maxStock,
  fulfillmentMode, productionLeadTimeDays,
}: {
  variantId: number
  name: string
  size: string
  price: number
  quantity: number
  imageUrl?: string
  maxStock?: number
  fulfillmentMode?: 'from_stock' | 'made_to_order'
  productionLeadTimeDays?: number | null
}) {
  const { updateQuantity, removeItem } = useCartStore()
  const atLimit = maxStock !== undefined && quantity >= maxStock

  return (
    <li className="flex gap-4 py-4 first:pt-0 last:pb-0 border-b border-andrequice-sand last:border-0">
      <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-andrequice-sand">
        {imageUrl ? (
          <img src={imageUrl} alt={name} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-andrequice-border">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-serif font-semibold text-andrequice-navy text-base leading-snug line-clamp-2">
              {name}
            </h4>
            {size && <p className="text-xs text-andrequice-border mt-0.5">Tamanho: {size}</p>}
          </div>
          <button
            type="button"
            onClick={() => removeItem(variantId)}
            aria-label={`Remover ${name} do carrinho`}
            className="flex-shrink-0 p-1.5 rounded-lg text-andrequice-border hover:text-andrequice-copper hover:bg-andrequice-sand transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={fulfillmentMode === 'made_to_order' ? 'copper' : 'sand'}>
            {fulfillmentMode === 'made_to_order' ? 'Sob encomenda' : 'Pronta entrega'}
          </Badge>
          {fulfillmentMode === 'made_to_order' && productionLeadTimeDays != null && (
            <span className="text-[11px] text-andrequice-brown/70">
              Pronta em até {productionLeadTimeDays} dias
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 mt-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateQuantity(variantId, quantity - 1)}
              aria-label="Diminuir quantidade"
              className="w-8 h-8 rounded-full border border-andrequice-border flex items-center justify-center text-andrequice-navy hover:border-andrequice-gold hover:text-andrequice-gold transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <span className="text-sm font-medium text-andrequice-brown w-6 text-center tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => !atLimit && updateQuantity(variantId, quantity + 1)}
              aria-label="Aumentar quantidade"
              disabled={atLimit}
              className={[
                'w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
                atLimit
                  ? 'border-andrequice-sand text-andrequice-border/40 cursor-not-allowed'
                  : 'border-andrequice-border text-andrequice-navy hover:border-andrequice-gold hover:text-andrequice-gold',
              ].join(' ')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="text-right">
            {quantity > 1 && (
              <p className="text-[11px] text-andrequice-border leading-none tabular-nums">
                {quantity}× {formatPrice(price)}
              </p>
            )}
            <p className="text-base font-semibold text-andrequice-navy tabular-nums">
              {formatPrice(price * quantity)}
            </p>
          </div>
        </div>

        {atLimit && (
          <p className="text-[11px] text-andrequice-copper font-medium leading-none">
            Máximo disponível: {maxStock}
          </p>
        )}
      </div>
    </li>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMAIL_RE = /\S+@\S+\.\S+/

const STEP_IDS = ['cart', 'shipping', 'contact', 'address'] as const
type StepId = typeof STEP_IDS[number]

export default function Cart() {
  const navigate = useNavigate()
  const { store } = useStore()
  const { items, total, updateQuantity, removeItem } = useCartStore()
  const {
    deliveryMethod, selectedShipping, shippingAddress,
    contact, addressExtra,
    setDeliveryMethod, setSelectedShipping, setShippingAddress,
    setContact, setAddressExtra,
  } = useCheckoutStore()

  // ── Bloco 2 — local form state for CEP + shipping option list ──────────
  const [cep, setCep] = useState(shippingAddress?.cep ?? '')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

  // ── Stock validation on mount ───────────────────────────────────────────
  const [stockMap, setStockMap] = useState<Record<number, number>>({})
  const [stockAlerts, setStockAlerts] = useState<string[]>([])
  const validated = useRef(false)
  useEffect(() => {
    if (validated.current || items.length === 0) return
    validated.current = true
    checkStock(items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })))
      .then((results) => {
        const newMap: Record<number, number> = {}
        const alerts: string[] = []
        results.forEach((r) => {
          newMap[r.variant_id] = r.available
          if (!r.valid && r.message) {
            if (r.available === 0) removeItem(r.variant_id)
            else updateQuantity(r.variant_id, r.available)
            alerts.push(r.message)
          }
        })
        setStockMap(newMap)
        if (alerts.length > 0) setStockAlerts(alerts)
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty-cart guard ────────────────────────────────────────────────────
  useEffect(() => {
    if (items.length === 0) navigate('/catalog', { replace: true })
  }, [items.length, navigate])

  // ── Derived totals & summaries ──────────────────────────────────────────
  const subtotal = total()
  const shippingCents = deliveryMethod === 'pickup' ? 0 : selectedShipping?.priceCents ?? null
  const shippingFee = shippingCents === null ? null : shippingCents / 100
  const itemCount = items.reduce((n, i) => n + i.quantity, 0)

  const aggregatedLeadTimeDays = useMemo(() =>
    items.reduce<number>((acc, i) => {
      if (i.fulfillmentMode !== 'made_to_order' || i.productionLeadTimeDays == null) return acc
      return Math.max(acc, i.productionLeadTimeDays)
    }, 0),
  [items])
  const promisedLabel = aggregatedLeadTimeDays > 0
    ? `Pronto para envio em até ${aggregatedLeadTimeDays} dias após o pagamento.`
    : null

  // ── Bloco 2 handlers (preserve shipping calculation flow) ───────────────
  const cheapest = shippingOptions?.length
    ? shippingOptions.reduce((a, b) => (a.price_cents <= b.price_cents ? a : b))
    : null
  const fastest = shippingOptions?.filter((o) => o.delivery_days > 0).length
    ? shippingOptions.filter((o) => o.delivery_days > 0)
      .reduce((a, b) => (a.delivery_days <= b.delivery_days ? a : b))
    : null

  const handleCepChange = useCallback((value: string) => {
    setCep(formatCep(value))
    if (shippingOptions !== null) {
      setShippingOptions(null)
      setSelectedShipping(null)
      setShippingError(null)
    }
  }, [shippingOptions, setSelectedShipping])

  const handleCalculate = useCallback(async () => {
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) {
      setShippingError('CEP inválido. Informe os 8 dígitos.')
      return
    }
    setShippingLoading(true)
    setShippingError(null)
    setShippingOptions(null)
    setSelectedShipping(null)
    try {
      const [{ data }, viaCep] = await Promise.all([
        api.post<ShippingOption[]>('/shipping/calculate', {
          zipcode: clean,
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
        }),
        fetch(`https://viacep.com.br/ws/${clean}/json/`).then((r) => r.json()).catch(() => null),
      ])
      setShippingOptions(data)
      if (data.length > 0) {
        const first = data[0]
        setSelectedShipping({
          serviceId: first.service_id,
          priceCents: first.price_cents,
          carrier: first.carrier,
          service: first.service,
          deliveryDays: first.delivery_days,
        })
      }
      if (viaCep && !viaCep.erro) {
        setShippingAddress({
          cep, street: viaCep.logradouro ?? '', city: viaCep.localidade ?? '', state: viaCep.uf ?? '',
        })
      }
    } catch {
      setShippingError('Não foi possível calcular o frete. Tente novamente.')
    } finally {
      setShippingLoading(false)
    }
  }, [cep, items, setSelectedShipping, setShippingAddress])

  const handleSelectOption = useCallback((opt: ShippingOption) => {
    setSelectedShipping({
      serviceId: opt.service_id, priceCents: opt.price_cents, carrier: opt.carrier,
      service: opt.service, deliveryDays: opt.delivery_days,
    })
  }, [setSelectedShipping])

  const handleMethodChange = useCallback((method: 'delivery' | 'pickup') => {
    setDeliveryMethod(method)
    if (method === 'pickup') setSelectedShipping(null)
  }, [setDeliveryMethod, setSelectedShipping])

  // ── Bloco 3 — Contact form state (sync with store on change) ───────────
  const handlePhoneChange = useCallback((value: string) => {
    const d = value.replace(/\D/g, '').slice(0, 11)
    const masked =
      d.length <= 2 ? d :
      d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` :
      d.length <= 10
        ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
        : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    setContact({ ...contact, phone: masked })
  }, [contact, setContact])

  // ── Validity flags per step ─────────────────────────────────────────────
  const isCartValid     = items.length > 0
  const isShippingValid = deliveryMethod === 'pickup' || (
    /^\d{5}-\d{3}$/.test(cep) && selectedShipping !== null
  )
  const isContactValid  =
    contact.name.trim().length >= 3 &&
    contact.phone.replace(/\D/g, '').length >= 10 &&
    EMAIL_RE.test(contact.email)
  const isAddressValid  = deliveryMethod === 'pickup' || (
    addressExtra.number.trim().length >= 1 &&
    !!shippingAddress?.cep
  )

  // ── Confirmed tracker (mirror of accordion internal set) ────────────────
  const [confirmedIds, setConfirmedIds] = useState<string[]>([])
  const allConfirmed = STEP_IDS.every((id) => confirmedIds.includes(id))

  // ── Step summaries ──────────────────────────────────────────────────────
  const cartSummary = `${itemCount} ${itemCount === 1 ? 'item' : 'itens'} · ${formatPrice(subtotal)}`
  const shippingSummary = deliveryMethod === 'pickup'
    ? formatShippingLine(selectedShipping ?? {}, { isPickup: true })
    : selectedShipping
      ? formatShippingLine(selectedShipping)
      : '—'
  const contactSummary = contact.email || '—'
  const addressSummary = deliveryMethod === 'pickup'
    ? 'Retirada presencial — sem entrega'
    : shippingAddress
      ? [
          `${shippingAddress.street}${addressExtra.number ? `, ${addressExtra.number}` : ''}`,
          `${shippingAddress.city} - ${shippingAddress.state}`,
          `CEP ${formatCep(shippingAddress.cep)}`,
        ].join(' · ')
      : '—'

  // ── Step definitions for the accordion ──────────────────────────────────
  const steps: AccordionStepDef[] = useMemo(() => [
    {
      id: 'cart',
      title: 'Carrinho',
      isValid: isCartValid,
      summary: cartSummary,
      render: ({ onConfirm, canConfirm }) => (
        <div className="flex flex-col gap-4">
          {stockAlerts.length > 0 && (
            <div className="rounded-xl border border-andrequice-copper/40 bg-andrequice-copper/5 px-4 py-3 flex flex-col gap-1">
              <p className="text-xs font-semibold text-andrequice-copper uppercase tracking-wide">
                Disponibilidade atualizada
              </p>
              {stockAlerts.map((msg, i) => (
                <p key={i} className="text-sm text-andrequice-copper">{msg}</p>
              ))}
              <button
                type="button"
                className="self-end text-[11px] text-andrequice-border underline mt-0.5"
                onClick={() => setStockAlerts([])}
              >
                Fechar
              </button>
            </div>
          )}
          <ul className="flex flex-col">
            {items.map((item) => (
              <LineItem
                key={item.variantId}
                variantId={item.variantId}
                name={item.name}
                size={item.size}
                price={item.price}
                quantity={item.quantity}
                imageUrl={item.imageUrl}
                maxStock={stockMap[item.variantId]}
                fulfillmentMode={item.fulfillmentMode}
                productionLeadTimeDays={item.productionLeadTimeDays}
              />
            ))}
          </ul>
          <Button variant="primary" size="lg" fullWidth disabled={!canConfirm} onClick={onConfirm}>
            Continuar
          </Button>
        </div>
      ),
    },
    {
      id: 'shipping',
      title: 'Método de entrega',
      isValid: isShippingValid,
      summary: shippingSummary,
      render: ({ onConfirm, canConfirm }) => (
        <div className="flex flex-col gap-4">
          {/* Delivery / Pickup toggle */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => handleMethodChange('delivery')}
              aria-pressed={deliveryMethod === 'delivery'}
              className={[
                'flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all',
                deliveryMethod === 'delivery'
                  ? 'border-andrequice-gold bg-andrequice-gold/5'
                  : 'border-andrequice-sand bg-white hover:border-andrequice-border',
              ].join(' ')}
            >
              <div className={[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                deliveryMethod === 'delivery' ? 'border-andrequice-gold' : 'border-andrequice-border',
              ].join(' ')}>
                {deliveryMethod === 'delivery' && <div className="w-2.5 h-2.5 rounded-full bg-andrequice-gold" />}
              </div>
              <div>
                <p className="font-sans font-medium text-andrequice-navy text-sm">Envio para o endereço</p>
                <p className="font-sans text-xs text-andrequice-border">Calcule o frete pelo CEP</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange('pickup')}
              aria-pressed={deliveryMethod === 'pickup'}
              className={[
                'flex items-center gap-4 w-full p-4 rounded-xl border-2 text-left transition-all',
                deliveryMethod === 'pickup'
                  ? 'border-andrequice-gold bg-andrequice-gold/5'
                  : 'border-andrequice-sand bg-white hover:border-andrequice-border',
              ].join(' ')}
            >
              <div className={[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                deliveryMethod === 'pickup' ? 'border-andrequice-gold' : 'border-andrequice-border',
              ].join(' ')}>
                {deliveryMethod === 'pickup' && <div className="w-2.5 h-2.5 rounded-full bg-andrequice-gold" />}
              </div>
              <div>
                <p className="font-sans font-medium text-andrequice-navy text-sm">Retirada presencial</p>
                <p className="font-sans text-xs text-andrequice-border">
                  Grátis{store?.pickup_city ? ` · ${store.pickup_city} - ${store.pickup_state}` : ''}
                </p>
              </div>
            </button>
          </div>

          {/* CEP + service options (delivery only) */}
          {deliveryMethod === 'delivery' && (
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Input
                  placeholder="00000-000"
                  value={cep}
                  onChange={handleCepChange}
                  inputMode="numeric"
                  maxLength={9}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && !shippingLoading && handleCalculate()}
                />
                <Button variant="outline" size="sm" onClick={handleCalculate} disabled={shippingLoading}>
                  {shippingLoading ? 'Calculando...' : 'Calcular'}
                </Button>
              </div>
              {shippingError && <p className="text-xs text-andrequice-copper">{shippingError}</p>}
              {shippingOptions !== null && shippingOptions.length === 0 && (
                <p className="text-xs text-andrequice-border">Nenhuma opção de frete disponível para este CEP.</p>
              )}
              {shippingOptions && shippingOptions.length > 0 && (
                <ul className="flex flex-col divide-y divide-andrequice-sand rounded-xl border border-andrequice-sand overflow-hidden">
                  {shippingOptions.map((opt) => {
                    const isCheapest = cheapest?.service_id === opt.service_id && opt.price_cents > 0
                    const isFastest =
                      fastest?.service_id === opt.service_id &&
                      fastest?.service_id !== cheapest?.service_id
                    const isSelected =
                      selectedShipping?.service === opt.service &&
                      selectedShipping?.carrier === opt.carrier
                    return (
                      <li key={`${opt.provider}-${opt.service_id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={[
                            'w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors',
                            isSelected ? 'bg-andrequice-sand/60' : 'bg-white hover:bg-andrequice-sand/30',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={[
                              'shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                              isSelected ? 'border-andrequice-navy' : 'border-andrequice-border/50',
                            ].join(' ')}>
                              {isSelected && <span className="w-2 h-2 rounded-full bg-andrequice-navy" />}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-andrequice-navy">
                                {opt.carrier} — {opt.service}
                              </p>
                              <p className="text-xs text-andrequice-border">
                                {opt.delivery_days === 0
                                  ? 'Retirada na loja'
                                  : `${opt.delivery_days} dia${opt.delivery_days !== 1 ? 's' : ''} útei${opt.delivery_days !== 1 ? 's' : 'l'}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            <span className="text-sm font-semibold text-andrequice-navy">
                              {opt.price_cents === 0 ? 'Grátis' : formatPrice(opt.price_cents / 100)}
                            </span>
                            <div className="flex gap-1">
                              {isCheapest && (
                                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                                  Menor preço
                                </span>
                              )}
                              {isFastest && (
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                                  Mais rápido
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {deliveryMethod === 'pickup' && store?.pickup_street && (
            <div className="rounded-xl bg-andrequice-sand/40 border border-andrequice-sand px-3 py-2.5">
              <p className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border mb-1">
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

          <Button variant="primary" size="lg" fullWidth disabled={!canConfirm} onClick={onConfirm}>
            Continuar
          </Button>
        </div>
      ),
    },
    {
      id: 'contact',
      title: 'Contato',
      isValid: isContactValid,
      summary: contactSummary,
      render: ({ onConfirm, canConfirm }) => (
        <div className="flex flex-col gap-3">
          <Input
            label="E-mail"
            placeholder="seuemail@exemplo.com"
            value={contact.email}
            onChange={(v) => setContact({ ...contact, email: v })}
            type="email"
            inputMode="email"
            required
            hint="Enviaremos a confirmação e o código de rastreamento para este e-mail."
          />
          <Input
            label="Nome completo"
            placeholder="João da Silva"
            value={contact.name}
            onChange={(v) => setContact({ ...contact, name: v })}
            required
          />
          <Input
            label="Telefone / WhatsApp"
            placeholder="(38) 99999-9999"
            value={contact.phone}
            onChange={handlePhoneChange}
            type="tel"
            inputMode="numeric"
            maxLength={15}
            required
          />
          <Button variant="primary" size="lg" fullWidth disabled={!canConfirm} onClick={onConfirm}>
            Continuar
          </Button>
        </div>
      ),
    },
    {
      id: 'address',
      title: 'Endereço de entrega',
      isValid: isAddressValid,
      summary: addressSummary,
      render: ({ onConfirm, canConfirm }) => (
        <div className="flex flex-col gap-3">
          {deliveryMethod === 'pickup' ? (
            <div className="rounded-xl bg-andrequice-sand/40 border border-andrequice-sand px-4 py-3">
              <p className="text-sm text-andrequice-navy">
                Retirada presencial selecionada — não é necessário endereço de entrega.
              </p>
              {store?.pickup_street && (
                <p className="text-xs text-andrequice-border mt-1">
                  Você poderá retirar em {store.pickup_street}
                  {store.pickup_number ? `, ${store.pickup_number}` : ''}
                  {store.pickup_city ? ` — ${store.pickup_city}-${store.pickup_state}` : ''}.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <Input
                  label="CEP"
                  value={shippingAddress?.cep ?? ''}
                  onChange={() => {}}
                  placeholder="00000-000"
                  required
                  disabled
                  className="flex-1"
                />
              </div>
              <Input
                label="Endereço"
                value={shippingAddress?.street ?? ''}
                onChange={() => {}}
                placeholder="Rua, Avenida..."
                required
                disabled
              />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Input
                    label="Número"
                    value={addressExtra.number}
                    onChange={(v) => setAddressExtra({ ...addressExtra, number: v })}
                    placeholder="123"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    label="Complemento"
                    value={addressExtra.complement}
                    onChange={(v) => setAddressExtra({ ...addressExtra, complement: v })}
                    placeholder="Apto, Bloco..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Cidade"
                    value={shippingAddress?.city ?? ''}
                    onChange={() => {}}
                    placeholder="Curvelo"
                    required
                    disabled
                  />
                </div>
                <div>
                  <Input
                    label="UF"
                    value={shippingAddress?.state ?? ''}
                    onChange={() => {}}
                    placeholder="MG"
                    required
                    disabled
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-andrequice-border pt-1">
                <span>País: Brasil</span>
                <span>CEP, cidade e logradouro vêm do cálculo de frete (etapa 2).</span>
              </div>
            </>
          )}
          <Button variant="primary" size="lg" fullWidth disabled={!canConfirm} onClick={onConfirm}>
            Continuar
          </Button>
        </div>
      ),
    },
  ], [
    isCartValid, cartSummary, items, stockAlerts, stockMap,
    isShippingValid, shippingSummary, deliveryMethod, cep, shippingError,
    shippingOptions, shippingLoading, selectedShipping, cheapest, fastest,
    handleMethodChange, handleCepChange, handleCalculate, handleSelectOption, store,
    isContactValid, contactSummary, contact, setContact, handlePhoneChange,
    isAddressValid, addressSummary, shippingAddress, addressExtra, setAddressExtra,
  ])

  // ── Final CTA: only enabled with all 4 confirmed ───────────────────────
  const handleFinalConfirm = useCallback(() => {
    if (!allConfirmed) return
    navigate('/checkout')
  }, [allConfirmed, navigate])

  // While the empty-cart effect resolves, render nothing to avoid flash.
  if (items.length === 0) return null

  return (
    <div className="min-h-screen bg-andrequice-cream/40 flex flex-col">
      <Header showBack />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 w-full flex flex-col gap-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-andrequice-navy">
          Revise seu pedido
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 items-start">
          {/* Left: accordion blocks + final CTA */}
          <div className="flex flex-col gap-4">
            <CheckoutAccordion steps={steps} onConfirmedChange={setConfirmedIds} />

            <span
              className="inline-block w-full"
              title={!allConfirmed ? 'Conclua todas as etapas acima para continuar.' : undefined}
            >
              <Button
                variant="gold"
                size="lg"
                fullWidth
                disabled={!allConfirmed}
                onClick={handleFinalConfirm}
              >
                Confirmar dados do pedido
              </Button>
            </span>
            {!allConfirmed && (
              <p className="text-xs text-center text-andrequice-border">
                Conclua as 4 etapas acima para liberar o pagamento.
              </p>
            )}
          </div>

          {/* Right: sticky order summary */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <OrderSummary
              items={items}
              subtotal={subtotal}
              shippingFee={shippingFee}
              promisedCompletionDate={promisedLabel}
            />
          </aside>
        </div>
      </div>

      <Footer />
    </div>
  )
}

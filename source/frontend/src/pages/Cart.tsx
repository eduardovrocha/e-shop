import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { MobileBottomBar } from '@/components/MobileBottomBar'
import { CartItem } from '@/components/CartItem'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { PriceTag } from '@/components/PriceTag'
import { SectionTitle } from '@/components/SectionTitle'
import { useCartStore } from '@/store/cartStore'
import { useCheckoutStore } from '@/store/checkoutStore'
import { useStore } from '@/hooks/useStore'
import { formatCep, formatPrice } from '@/lib/utils'
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

export default function Cart() {
  const navigate = useNavigate()
  const { store } = useStore()
  const { items, total, updateQuantity, removeItem } = useCartStore()
  const {
    deliveryMethod,
    selectedShipping,
    setDeliveryMethod,
    setSelectedShipping,
    setShippingAddress,
  } = useCheckoutStore()

  const [cep, setCep] = useState('')
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState<string | null>(null)

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
            if (r.available === 0) {
              removeItem(r.variant_id)
            } else {
              updateQuantity(r.variant_id, r.available)
            }
            alerts.push(r.message)
          }
        })

        setStockMap(newMap)
        if (alerts.length > 0) setStockAlerts(alerts)
      })
      .catch(() => {})
  }, []) // intentional: validate once on mount only

  const subtotal = total()
  const shippingCents =
    deliveryMethod === 'pickup' ? 0 : selectedShipping?.priceCents ?? null
  const orderTotal = subtotal + (shippingCents !== null ? shippingCents / 100 : 0)

  const cheapest = shippingOptions?.length
    ? shippingOptions.reduce((a, b) => (a.price_cents <= b.price_cents ? a : b))
    : null

  const fastest = shippingOptions?.filter((o) => o.delivery_days > 0).length
    ? shippingOptions
        .filter((o) => o.delivery_days > 0)
        .reduce((a, b) => (a.delivery_days <= b.delivery_days ? a : b))
    : null

  function handleMethodChange(method: 'delivery' | 'pickup') {
    setDeliveryMethod(method)
    if (method === 'pickup') {
      setSelectedShipping(null)
    }
  }

  function handleCepChange(value: string) {
    setCep(formatCep(value))
    if (shippingOptions !== null) {
      setShippingOptions(null)
      setSelectedShipping(null)
      setShippingError(null)
    }
  }

  async function handleCalculate() {
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
          cep,
          street: viaCep.logradouro ?? '',
          city: viaCep.localidade ?? '',
          state: viaCep.uf ?? '',
        })
      }
    } catch {
      setShippingError('Não foi possível calcular o frete. Tente novamente.')
    } finally {
      setShippingLoading(false)
    }
  }

  function handleSelectOption(opt: ShippingOption) {
    setSelectedShipping({
      serviceId: opt.service_id,
      priceCents: opt.price_cents,
      carrier: opt.carrier,
      service: opt.service,
      deliveryDays: opt.delivery_days,
    })
  }

  const canProceed =
    deliveryMethod === 'pickup' ||
    (deliveryMethod === 'delivery' && selectedShipping !== null)

  // Optimistic lead-time estimate for the cart: max of made_to_order item
  // lead times. The precise queue-aware estimate only appears post create_intent.
  const aggregatedLeadTimeDays = items.reduce<number>((acc, i) => {
    if (i.fulfillmentMode !== 'made_to_order' || i.productionLeadTimeDays == null) return acc
    return Math.max(acc, i.productionLeadTimeDays)
  }, 0)

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack />
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-20 gap-6 text-center">
          <div className="w-20 h-20 rounded-full bg-andrequice-sand flex items-center justify-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-andrequice-border"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-serif text-xl text-andrequice-navy">Seu carrinho está vazio</p>
            <p className="font-sans text-sm text-andrequice-border">
              Escolha uma peça da nossa coleção
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/catalog')}>
            Ver Catálogo
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack />

      <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-40 flex flex-col gap-6">
        <SectionTitle
          title="Carrinho"
          subtitle={`${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
        />

        {/* Stock alerts */}
        {stockAlerts.length > 0 && (
          <div className="rounded-2xl border border-andrequice-copper/40 bg-andrequice-copper/8 px-4 py-3 flex flex-col gap-1.5">
            <p className="text-xs font-semibold text-andrequice-copper uppercase tracking-wide">
              Disponibilidade atualizada
            </p>
            {stockAlerts.map((msg, i) => (
              <p key={i} className="text-sm text-andrequice-copper">{msg}</p>
            ))}
            <button
              className="self-end text-[11px] text-andrequice-border underline mt-0.5"
              onClick={() => setStockAlerts([])}
            >
              Fechar
            </button>
          </div>
        )}

        {/* Items */}
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <CartItem
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

        {/* Delivery method + shipping calculator */}
        <div className="bg-white rounded-2xl p-4 shadow-soft flex flex-col gap-4">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border">
            Método de entrega
          </h3>

          <div className="flex flex-col gap-2">
            {/* Envio */}
            <button
              type="button"
              onClick={() => handleMethodChange('delivery')}
              aria-pressed={deliveryMethod === 'delivery'}
              className={[
                'flex items-center gap-4 w-full p-4 rounded-2xl border-2 text-left transition-all duration-150',
                deliveryMethod === 'delivery'
                  ? 'border-andrequice-gold bg-andrequice-gold/5'
                  : 'border-andrequice-sand bg-white hover:border-andrequice-border',
              ].join(' ')}
            >
              <div className={[
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                deliveryMethod === 'delivery' ? 'border-andrequice-gold' : 'border-andrequice-border',
              ].join(' ')}>
                {deliveryMethod === 'delivery' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-andrequice-gold" />
                )}
              </div>
              <div>
                <p className="font-sans font-medium text-andrequice-navy text-sm">Envio para o endereço</p>
                <p className="font-sans text-xs text-andrequice-border">Calcule o frete pelo CEP</p>
              </div>
            </button>

            {/* Retirada */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleMethodChange('pickup')}
                aria-pressed={deliveryMethod === 'pickup'}
                className={[
                  'flex items-center gap-4 w-full p-4 border-2 text-left transition-all duration-150',
                  deliveryMethod === 'pickup'
                    ? 'border-andrequice-gold bg-andrequice-gold/5'
                    : 'border-andrequice-sand bg-white hover:border-andrequice-border',
                  deliveryMethod === 'pickup' && store?.pickup_street
                    ? 'rounded-t-2xl border-b-0'
                    : 'rounded-2xl',
                ].join(' ')}
              >
                <div className={[
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  deliveryMethod === 'pickup' ? 'border-andrequice-gold' : 'border-andrequice-border',
                ].join(' ')}>
                  {deliveryMethod === 'pickup' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-andrequice-gold" />
                  )}
                </div>
                <div>
                  <p className="font-sans font-medium text-andrequice-navy text-sm">Retirada presencial</p>
                  <p className="font-sans text-xs text-andrequice-border">
                    Grátis{store?.pickup_city ? ` · ${store.pickup_city} - ${store.pickup_state}` : ''}
                  </p>
                </div>
              </button>

              {deliveryMethod === 'pickup' && store?.pickup_street && (
                <div className="border-2 border-t-0 border-andrequice-gold bg-andrequice-gold/5 rounded-b-2xl px-4 pb-4 pt-3">
                  <p className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border mb-2">
                    Local de retirada
                  </p>
                  <p className="font-sans text-sm text-andrequice-navy">
                    {store.pickup_street}{store.pickup_number ? `, ${store.pickup_number}` : ''}
                    {store.pickup_complement ? `, ${store.pickup_complement}` : ''}
                  </p>
                  <p className="font-sans text-xs text-andrequice-border mt-0.5">
                    {store.pickup_city} - {store.pickup_state}
                    {store.pickup_zipcode ? `, CEP ${store.pickup_zipcode}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CEP + options — only when delivery */}
          {deliveryMethod === 'delivery' && (
            <div className="flex flex-col gap-3 pt-1">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCalculate}
                  disabled={shippingLoading}
                >
                  {shippingLoading ? 'Calculando...' : 'Calcular'}
                </Button>
              </div>

              {shippingError && (
                <p className="text-xs text-red-600">{shippingError}</p>
              )}

              {shippingOptions !== null && shippingOptions.length === 0 && (
                <p className="text-xs text-andrequice-border">
                  Nenhuma opção de frete disponível para este CEP.
                </p>
              )}

              {shippingOptions && shippingOptions.length > 0 && (
                <ul className="flex flex-col divide-y divide-andrequice-sand rounded-xl border border-andrequice-sand overflow-hidden">
                  {shippingOptions.map((opt) => {
                    const isCheapest = cheapest?.service_id === opt.service_id && opt.price_cents > 0
                    const isFastest =
                      fastest?.service_id === opt.service_id &&
                      fastest?.service_id !== cheapest?.service_id
                    const isSelected = selectedShipping?.service === opt.service && selectedShipping?.carrier === opt.carrier

                    return (
                      <li key={`${opt.provider}-${opt.service_id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectOption(opt)}
                          className={[
                            'w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors',
                            isSelected
                              ? 'bg-andrequice-sand/60'
                              : 'bg-white hover:bg-andrequice-sand/30',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={[
                              'shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center',
                              isSelected ? 'border-andrequice-navy' : 'border-andrequice-border/50',
                            ].join(' ')}>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-andrequice-navy" />
                              )}
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
        </div>

        {/* Order summary */}
        <div className="bg-white rounded-2xl p-4 shadow-soft flex flex-col gap-3">
          <h3 className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border mb-1">
            Resumo do pedido
          </h3>
          <div className="flex justify-between text-sm text-andrequice-brown">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-andrequice-brown">
            <span>Frete</span>
            <span>
              {deliveryMethod === 'pickup'
                ? 'Grátis'
                : shippingCents === null
                  ? '—'
                  : shippingCents === 0
                    ? 'Grátis'
                    : formatPrice(shippingCents / 100)}
            </span>
          </div>
          {aggregatedLeadTimeDays > 0 && (
            <div className="rounded-xl bg-andrequice-sand/40 border border-andrequice-sand px-3 py-2.5">
              <p className="text-xs font-semibold text-andrequice-navy">Prazo estimado de envio</p>
              <p className="text-xs text-andrequice-brown/80 mt-0.5">
                Seu pedido será enviado em até {aggregatedLeadTimeDays} dias após a confirmação do pagamento.
              </p>
            </div>
          )}
          <div className="h-px bg-andrequice-sand" />
          <div className="flex justify-between items-center">
            <span className="font-sans font-semibold text-andrequice-navy">Total</span>
            <PriceTag value={orderTotal} size="lg" />
          </div>
          {deliveryMethod === 'delivery' && shippingCents === null && (
            <p className="text-xs text-andrequice-border text-right">
              Calcule o frete para ver o total final
            </p>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <MobileBottomBar>
        <div className="flex flex-col gap-1.5">
          {!canProceed && (
            <p className="text-xs text-center text-andrequice-border">
              Selecione uma opção de frete para continuar
            </p>
          )}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canProceed}
            onClick={() => navigate('/checkout')}
          >
            Continuar para Pagamento
          </Button>
        </div>
      </MobileBottomBar>
    </div>
  )
}

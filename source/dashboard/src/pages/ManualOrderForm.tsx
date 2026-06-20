import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, Plus, Search, Trash2 } from 'lucide-react'
import axios from 'axios'
import { PageTitle } from '@/components/PageTitle'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PriceTag } from '@/components/PriceTag'
import { formatCurrency, maskPhoneBR } from '@/lib/utils'
import {
  brlToCents,
  computeTotals,
  isTotalValid,
  PAYMENT_METHOD_LABELS,
  SHIPPING_MODE_LABELS,
  type ExternalPaymentMethod,
  type ShippingMode,
} from '@/lib/manualOrder'
import { useProducts } from '@/hooks/useProducts'
import { useCustomers } from '@/hooks/useCustomers'
import { useCreateOrder } from '@/hooks/useOrders'
import { useCepLookup } from '@/hooks/useCepLookup'
import { useToast } from '@/hooks/useToast'
import { shippingService } from '@/services/shippingService'
import type { ShippingOption } from '@/types/shipping'
import type { ManualOrderPayload } from '@/services/ordersService'

interface FormLine {
  variant_id: number
  product_id: number
  name: string
  size: string | null
  quantity: number
  priceReais: string
}

function centsToReaisInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

const today = () => new Date().toISOString().slice(0, 10)

export default function ManualOrderForm() {
  const navigate = useNavigate()
  const toast = useToast()
  const createOrder = useCreateOrder()

  // ── Cliente ────────────────────────────────────────────────────────────
  const [customerSearch, setCustomerSearch] = useState('')
  const customers = useCustomers({ search: customerSearch || undefined, per_page: 5 })
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // ── Itens ──────────────────────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('')
  const products = useProducts({ search: productSearch || undefined, per_page: 6 })
  const [lines, setLines] = useState<FormLine[]>([])

  // ── Pagamento ──────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<ExternalPaymentMethod>('pix')
  const [paidAt, setPaidAt] = useState(today())

  // ── Envio ──────────────────────────────────────────────────────────────
  const [shippingMode, setShippingMode] = useState<ShippingMode>('retirada')
  const cep = useCepLookup()
  const [quoteOptions, setQuoteOptions] = useState<ShippingOption[] | null>(null)
  const [selectedQuote, setSelectedQuote] = useState<ShippingOption | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [manualShippingReais, setManualShippingReais] = useState('0,00')

  // ── Total ──────────────────────────────────────────────────────────────
  const [discountReais, setDiscountReais] = useState('0,00')
  const [notes, setNotes] = useState('')

  const totals = useMemo(
    () =>
      computeTotals({
        items: lines.map((l) => ({ quantity: l.quantity, unit_price_cents: brlToCents(l.priceReais) })),
        shippingMode,
        quoteCents: selectedQuote?.price_cents ?? null,
        manualShippingCostCents: brlToCents(manualShippingReais),
        manualDiscountCents: brlToCents(discountReais),
      }),
    [lines, shippingMode, selectedQuote, manualShippingReais, discountReais]
  )

  const totalOk = isTotalValid(totals.totalCents)

  // ── Handlers de itens ────────────────────────────────────────────────────
  function addVariant(args: {
    variantId: number
    productId: number
    productName: string
    size: string | null
    priceCents: number
  }) {
    setLines((prev) => {
      if (prev.some((l) => l.variant_id === args.variantId)) return prev
      return [
        ...prev,
        {
          variant_id: args.variantId,
          product_id: args.productId,
          name: args.productName,
          size: args.size,
          quantity: 1,
          priceReais: centsToReaisInput(args.priceCents),
        },
      ]
    })
    setProductSearch('')
  }

  function updateLine(variantId: number, patch: Partial<FormLine>) {
    setLines((prev) => prev.map((l) => (l.variant_id === variantId ? { ...l, ...patch } : l)))
  }

  function removeLine(variantId: number) {
    setLines((prev) => prev.filter((l) => l.variant_id !== variantId))
  }

  function selectCustomer(c: { name: string; email: string; phone: string }) {
    setName(c.name)
    setEmail(c.email)
    setPhone(maskPhoneBR(c.phone))
    setCustomerSearch('')
  }

  // ── Cotação de frete (melhor_envio) ──────────────────────────────────────
  async function handleQuote() {
    const clean = cep.address.cep.replace(/\D/g, '')
    if (clean.length !== 8) {
      toast.error('Informe um CEP válido antes de cotar o frete.')
      return
    }
    if (lines.length === 0) {
      toast.error('Adicione itens antes de cotar o frete.')
      return
    }
    setQuoteLoading(true)
    try {
      const options = await shippingService.calculate(
        clean,
        lines.map((l) => ({ productId: l.product_id, quantity: l.quantity }))
      )
      setQuoteOptions(options)
      setSelectedQuote(options[0] ?? null)
      if (options.length === 0) toast.warning('Nenhuma opção de frete retornada para este CEP.')
    } catch {
      toast.error('Não foi possível cotar o frete. Tente novamente.')
    } finally {
      setQuoteLoading(false)
    }
  }

  function changeShippingMode(mode: ShippingMode) {
    setShippingMode(mode)
    setQuoteOptions(null)
    setSelectedQuote(null)
  }

  // ── Submit ───────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (lines.length === 0) return 'Adicione ao menos um item ao pedido.'
    if (!name.trim() || (!email.trim() && !phone.trim())) {
      return 'Informe o nome e ao menos um contato (email ou telefone) do cliente.'
    }
    if (shippingMode !== 'retirada') {
      if (!cep.address.cep.trim() || !cep.address.address.trim() || !cep.address.city.trim()) {
        return 'Preencha o endereço de entrega para este modo de envio.'
      }
    }
    if (!totalOk) return 'O total do pedido não pode ser negativo.'
    return null
  }

  async function handleSubmit() {
    const error = validate()
    if (error) {
      toast.error(error)
      return
    }

    const payload: ManualOrderPayload = {
      customer: {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.replace(/\D/g, '') || undefined,
      },
      items: lines.map((l) => ({
        variant_id: l.variant_id,
        quantity: l.quantity,
        unit_price_cents: brlToCents(l.priceReais),
      })),
      external_payment_method: paymentMethod,
      paid_at: paidAt || undefined,
      shipping_mode: shippingMode,
      manual_discount_cents: brlToCents(discountReais),
      notes: notes.trim() || undefined,
    }

    if (shippingMode === 'melhor_envio') {
      payload.shipping_fee_cents = selectedQuote?.price_cents ?? 0
      payload.carrier = selectedQuote?.carrier
      payload.shipping_service = selectedQuote?.service
    } else if (shippingMode === 'manual') {
      payload.manual_shipping_cost_cents = brlToCents(manualShippingReais)
    }

    if (shippingMode !== 'retirada') {
      payload.shipping_address = {
        cep: cep.address.cep,
        address: cep.address.address,
        city: cep.address.city,
        state: cep.address.state,
        neighborhood: cep.address.neighborhood || undefined,
      }
    }

    try {
      const created = await createOrder.mutateAsync(payload)
      toast.success(`Pedido ${created.number} registrado.`)
      navigate(`/orders/${created.id}`)
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.data?.error
          ? (err.response.data.error as string)
          : 'Não foi possível registrar o pedido.'
      toast.error(message)
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle title="Novo pedido manual" subtitle="Registre uma venda fechada fora do site" />

      {/* ── Cliente ── */}
      <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nome, email ou telefone..."
                className="pl-9"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerSearch.length >= 2 && (customers.data?.customers.length ?? 0) > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-andrequice-sand bg-white shadow-card">
                  {customers.data!.customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectCustomer(c)}
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-andrequice-cream"
                    >
                      <span className="text-sm font-medium text-andrequice-navy">{c.name}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {c.email} {c.phone ? `· ${c.phone}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="customer-name">Nome</Label>
                <Input id="customer-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customer-phone">Telefone</Label>
                <Input
                  id="customer-phone"
                  inputMode="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(maskPhoneBR(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
      </Card>

      {/* ── Itens ── */}
      <Card>
          <CardHeader>
            <CardTitle>Itens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar produto para adicionar..."
                className="pl-9"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              {productSearch.length >= 2 && (products.data?.products.length ?? 0) > 0 && (
                <div className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-andrequice-sand bg-white shadow-card">
                  {products.data!.products.map((p) => (
                    <div key={p.id} className="border-b border-andrequice-sand/60 last:border-0">
                      <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">{p.name}</p>
                      <div className="flex flex-wrap gap-1 p-2">
                        {p.variants.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              addVariant({
                                variantId: v.id,
                                productId: p.id,
                                productName: p.name,
                                size: v.size,
                                priceCents: v.effective_price_cents ?? v.price_cents ?? p.price_cents,
                              })
                            }
                            className="rounded-md border border-andrequice-sand px-2 py-1 text-xs text-andrequice-navy hover:border-andrequice-gold hover:bg-andrequice-cream"
                          >
                            {v.size} · {formatCurrency(v.effective_price_cents ?? v.price_cents ?? p.price_cents)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {lines.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item adicionado.</p>
            ) : (
              <div className="space-y-2">
                {lines.map((l) => (
                  <div
                    key={l.variant_id}
                    className="flex flex-wrap items-end gap-3 rounded-lg border border-andrequice-sand p-3"
                  >
                    <div className="min-w-[160px] flex-1">
                      <p className="text-sm font-medium text-andrequice-navy">{l.name}</p>
                      <p className="text-[11px] text-muted-foreground">Tamanho {l.size ?? '—'}</p>
                    </div>
                    <div className="w-20 space-y-1.5">
                      <Label>Qtd.</Label>
                      <Input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.variant_id, { quantity: Math.max(1, Number(e.target.value)) })
                        }
                      />
                    </div>
                    <div className="w-28 space-y-1.5">
                      <Label>Preço un.</Label>
                      <Input
                        inputMode="decimal"
                        value={l.priceReais}
                        onChange={(e) => updateLine(l.variant_id, { priceReais: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remover item"
                      onClick={() => removeLine(l.variant_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
      </Card>

      {/* ── Pagamento + Envio ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              Este pedido nasce com pagamento confirmado (pago).
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as ExternalPaymentMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_METHOD_LABELS) as ExternalPaymentMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="paid-at">Data do pagamento</Label>
                <Input id="paid-at" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Envio ── */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Envio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modo de envio</Label>
              <Select value={shippingMode} onValueChange={(v) => changeShippingMode(v as ShippingMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SHIPPING_MODE_LABELS) as ShippingMode[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {SHIPPING_MODE_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {shippingMode !== 'retirada' && (
              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <div className="w-36 space-y-1.5">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={cep.address.cep}
                      onChange={(e) => cep.setField('cep', e.target.value)}
                    />
                  </div>
                  <Button variant="outline" onClick={() => void cep.lookup()} disabled={cep.loading}>
                    {cep.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar CEP'}
                  </Button>
                </div>
                {cep.error && <p className="text-xs text-destructive">{cep.error}</p>}

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={cep.address.address}
                      disabled={!cep.isStreetEmptyFromCep && cep.address.address.length > 0}
                      onChange={(e) => cep.setField('address', e.target.value)}
                    />
                    {cep.isStreetEmptyFromCep && (
                      <p className="text-[11px] text-muted-foreground">
                        Este CEP atende a cidade toda. Informe o nome da rua.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={cep.address.neighborhood}
                      disabled={!cep.isNeighborhoodEmptyFromCep && cep.address.neighborhood.length > 0}
                      onChange={(e) => cep.setField('neighborhood', e.target.value)}
                    />
                    {cep.isNeighborhoodEmptyFromCep && (
                      <p className="text-[11px] text-muted-foreground">
                        Este CEP atende a cidade toda. Informe o bairro, se houver.
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" value={cep.address.city} disabled />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="state">UF</Label>
                    <Input id="state" value={cep.address.state} disabled />
                  </div>
                </div>
              </div>
            )}

            {shippingMode === 'melhor_envio' && (
              <div className="space-y-2">
                <Button variant="outline" onClick={() => void handleQuote()} disabled={quoteLoading}>
                  {quoteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Cotar frete'}
                </Button>
                {quoteOptions?.map((opt) => (
                  <button
                    key={opt.service_id}
                    type="button"
                    onClick={() => setSelectedQuote(opt)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedQuote?.service_id === opt.service_id
                        ? 'border-andrequice-gold bg-andrequice-cream'
                        : 'border-andrequice-sand hover:bg-andrequice-cream/60'
                    }`}
                  >
                    <span>
                      {opt.carrier} — {opt.service}
                      {opt.delivery_days > 0 ? ` · até ${opt.delivery_days} dias` : ''}
                    </span>
                    <span className="font-semibold">{formatCurrency(opt.price_cents)}</span>
                  </button>
                ))}
              </div>
            )}

            {shippingMode === 'manual' && (
              <div className="w-40 space-y-1.5">
                <Label htmlFor="manual-shipping">Frete (R$)</Label>
                <Input
                  id="manual-shipping"
                  inputMode="decimal"
                  value={manualShippingReais}
                  onChange={(e) => setManualShippingReais(e.target.value)}
                />
              </div>
            )}

            {shippingMode === 'retirada' && (
              <p className="text-sm text-muted-foreground">
                Retirada na loja — frete grátis, sem endereço de entrega.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Total ── */}
      <Card>
          <CardHeader>
            <CardTitle>Total</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="discount">Desconto no total (R$)</Label>
                <Input
                  id="discount"
                  inputMode="decimal"
                  value={discountReais}
                  onChange={(e) => setDiscountReais(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Observações internas</Label>
                <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1 rounded-lg bg-andrequice-cream/60 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(totals.itemsTotalCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span>{formatCurrency(totals.shippingFeeCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span>− {formatCurrency(totals.manualDiscountCents)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-andrequice-sand pt-2">
                <span className="font-semibold text-andrequice-navy">Total</span>
                <PriceTag cents={totals.totalCents} size="lg" />
              </div>
              {!totalOk && (
                <p className="text-xs text-destructive">O total não pode ser negativo.</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => navigate('/orders')}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSubmit()} disabled={createOrder.isPending || !totalOk}>
                {createOrder.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Registrar pedido
              </Button>
            </div>
          </CardContent>
      </Card>
    </div>
  )
}

import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { ArrowLeft, Loader2, Plus, Trash2, Package, Settings2 } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ProductImageUploader } from '@/components/ProductImageUploader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CategoryManagerModal } from '@/components/CategoryManagerModal'
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'
import type { VariantPayload, FulfillmentMode } from '@/types/product'
const SIZES = ['PP', 'P', 'M', 'G', 'GG', 'GGG', 'U']

interface VariantRow extends VariantPayload {
  _key: string
  _priceInput: string
  // Controlled-input string for the "Preço de" (compare_at_price) cell.
  // '' represents "no override" → backend falls back to the product-level
  // compare_at_price. Parsed to cents on blur, same as the regular price.
  _compareInput: string
  _destroy?: boolean
}

function generateSku(productName: string, size: string): string {
  const base = productName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join('')
    .slice(0, 8)
  return `${base}-${size}-${Date.now().toString(36).toUpperCase().slice(-4)}`
}

function stockBadge(qty: number) {
  if (qty === 0) return <Badge variant="destructive">Zerado</Badge>
  if (qty <= 5) return <Badge variant="warning">Crítico</Badge>
  return <Badge variant="success">{qty} un.</Badge>
}

function parsePriceInput(raw: string): number | null {
  const clean = raw.trim().replace(',', '.')
  if (!clean) return null
  const parsed = parseFloat(clean)
  if (isNaN(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function formatPriceInput(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return ''
  return (cents / 100).toFixed(2).replace('.', ',')
}

interface VariantTableProps {
  variants: VariantRow[]
  productName: string
  onChange: (rows: VariantRow[]) => void
}

function VariantTable({ variants, productName, onChange }: VariantTableProps) {
  const [pendingRemoveKey, setPendingRemoveKey] = useState<string | null>(null)
  const active = variants.filter((v) => !v._destroy)
  const pendingVariant = pendingRemoveKey ? active.find((v) => v._key === pendingRemoveKey) : null

  function addSize(size: string) {
    if (active.some((v) => v.size === size)) return
    const newRow: VariantRow = {
      _key: `new-${Date.now()}`,
      size,
      sku: generateSku(productName || 'PRODUTO', size),
      stock_quantity: 0,
      price_cents: null,
      compare_at_price_cents: null,
      _priceInput: '',
      _compareInput: '',
      additional_price_cents: 0,
    }
    onChange([...variants, newRow])
  }

  function updateRow(key: string, field: keyof VariantRow, value: string | number | boolean | null) {
    onChange(
      variants.map((v) => (v._key === key ? { ...v, [field]: value } : v))
    )
  }

  function handlePriceBlur(key: string, raw: string) {
    const cents = parsePriceInput(raw)
    onChange(
      variants.map((v) =>
        v._key === key
          ? { ...v, _priceInput: cents != null ? formatPriceInput(cents) : '', price_cents: cents }
          : v
      )
    )
  }

  function handleCompareBlur(key: string, raw: string) {
    // Blank = no override; backend falls back to product-level compare_at_price.
    // Any non-blank value is parsed to cents like the regular price.
    const cents = parsePriceInput(raw)
    onChange(
      variants.map((v) =>
        v._key === key
          ? {
              ...v,
              _compareInput:          cents != null ? formatPriceInput(cents) : '',
              compare_at_price_cents: cents,
            }
          : v
      )
    )
  }

  function removeRow(key: string) {
    onChange(
      variants.map((v) =>
        v._key === key
          ? v.id
            ? { ...v, _destroy: true }
            : null
          : v
      ).filter(Boolean) as VariantRow[]
    )
  }

  const usedSizes = new Set(active.map((v) => v.size))

  return (
    <div className="space-y-4">
      {/* Quick-add buttons */}
      <div className="flex flex-wrap gap-2">
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => addSize(size)}
            disabled={usedSizes.has(size)}
            className={[
              'h-8 w-10 rounded border text-xs font-semibold transition-colors',
              usedSizes.has(size)
                ? 'border-border bg-muted text-muted-foreground cursor-not-allowed'
                : 'border-border hover:border-primary hover:text-primary',
            ].join(' ')}
          >
            {size}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const custom = prompt('Tamanho personalizado:')
            if (custom?.trim()) addSize(custom.trim().toUpperCase())
          }}
          className="h-8 px-2 rounded border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Outro
        </button>
      </div>

      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          Clique nos tamanhos acima para adicionar variantes
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">Tamanho</th>
                <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">SKU</th>
                <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-28">Estoque</th>
                <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-32">
                  Preço atual (R$) <span className="text-destructive">*</span>
                </th>
                <th className="pb-2 pr-3 font-medium text-muted-foreground text-xs uppercase tracking-wide w-36">
                  Preço anterior (R$){' '}
                  <span
                    className="font-normal normal-case text-[10px] text-muted-foreground/80"
                    title="Aparece riscado no site. Deve ser MAIOR que o preço atual para indicar promoção. Valor menor ou igual é ignorado."
                  >
                    (de · riscado)
                  </span>
                </th>
                <th className="pb-2 font-medium text-muted-foreground text-xs uppercase tracking-wide text-center">Status</th>
                <th className="pb-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {active.map((v) => (
                <tr key={v._key} className="border-b border-border/50 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="inline-flex h-7 w-9 items-center justify-center rounded border border-border text-xs font-semibold">
                      {v.size}
                    </span>
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      value={v.sku}
                      onChange={(e) => updateRow(v._key, 'sku', e.target.value)}
                      className="h-8 font-mono text-xs w-40"
                      placeholder="SKU"
                      required
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      type="number"
                      min={0}
                      value={v.stock_quantity}
                      onChange={(e) =>
                        updateRow(v._key, 'stock_quantity', Math.max(0, parseInt(e.target.value) || 0))
                      }
                      className="h-8 w-24"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    <Input
                      value={v._priceInput}
                      onChange={(e) => updateRow(v._key, '_priceInput', e.target.value)}
                      onBlur={(e) => handlePriceBlur(v._key, e.target.value)}
                      placeholder="0,00"
                      required
                      className={[
                        'h-8 w-28 text-right tabular-nums font-medium',
                        !v._priceInput ? 'border-destructive/60 focus-visible:ring-destructive/30' : '',
                      ].join(' ')}
                      inputMode="decimal"
                    />
                  </td>
                  <td className="py-2 pr-3">
                    {(() => {
                      // Warn inline when the admin typed a "Preço anterior"
                      // that isn't strictly greater than "Preço atual" — the
                      // backend would silently nullify and the storefront
                      // wouldn't show any promo. Cheaper than a 422 round-trip.
                      const compareCents = parsePriceInput(v._compareInput)
                      const priceCents   = v.price_cents
                      const invalidPromo =
                        compareCents != null && priceCents != null && compareCents <= priceCents
                      return (
                        <div className="flex flex-col items-end gap-0.5">
                          <Input
                            value={v._compareInput}
                            onChange={(e) => updateRow(v._key, '_compareInput', e.target.value)}
                            onBlur={(e) => handleCompareBlur(v._key, e.target.value)}
                            placeholder="—"
                            className={[
                              'h-8 w-28 text-right tabular-nums line-through decoration-1',
                              invalidPromo
                                ? 'border-destructive/60 text-destructive focus-visible:ring-destructive/30'
                                : 'text-muted-foreground',
                            ].join(' ')}
                            inputMode="decimal"
                            title="Preço anterior — aparece riscado no site. Deve ser maior que o preço atual. Em branco = herda do produto."
                          />
                          {invalidPromo && (
                            <span className="text-[10px] leading-none text-destructive">
                              precisa ser maior que o preço atual
                            </span>
                          )}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="py-2 text-center">
                    {stockBadge(v.stock_quantity)}
                  </td>
                  <td className="py-2 pl-2">
                    <button
                      type="button"
                      onClick={() => setPendingRemoveKey(v._key)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={`Remover tamanho ${v.size}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-muted-foreground">
            Total em estoque:{' '}
            <strong>{active.reduce((sum, v) => sum + v.stock_quantity, 0)}</strong> unidades
            em <strong>{active.length}</strong> tamanho{active.length !== 1 ? 's' : ''}.
          </p>
          {active.some((v) => !v._priceInput) && (
            <p className="text-xs text-destructive font-medium">
              Tamanhos sem preço: {active.filter((v) => !v._priceInput).map((v) => v.size).join(', ')}
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={pendingRemoveKey !== null}
        onOpenChange={(open) => !open && setPendingRemoveKey(null)}
        title="Remover variante"
        description={`Tem certeza que deseja excluir o tamanho "${pendingVariant?.size ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={() => {
          if (pendingRemoveKey) removeRow(pendingRemoveKey)
          setPendingRemoveKey(null)
        }}
      />
    </div>
  )
}

export default function ProductForm() {
  const { id } = useParams()
  const isEdit = !!id
  const navigate = useNavigate()
  const toast = useToast()

  const { data: existing, isLoading } = useProduct(isEdit ? parseInt(id) : 0)
  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()

  const { data: categoriesData } = useCategories()
  // useMemo keeps the array reference stable between renders so it's safe as
  // a useEffect dependency. Using `= []` inline would create a new ref every
  // render and cause the default-category effect to fire in an infinite loop.
  const categoryNames = useMemo(
    () => categoriesData?.map((c) => c.name) ?? [],
    [categoriesData]
  )

  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false)
  const manageTriggerRef = useRef<HTMLButtonElement>(null)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [active, setActive] = useState(true)
  const [variants, setVariants] = useState<VariantRow[]>([])

  // Dimensões logísticas
  const [weightG, setWeightG] = useState('')
  const [heightMm, setHeightMm] = useState('')
  const [widthMm, setWidthMm] = useState('')
  const [lengthMm, setLengthMm] = useState('')

  // Modalidade de venda
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>('from_stock')
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [productionCapacity, setProductionCapacity] = useState('')
  const [refundPct, setRefundPct] = useState('')
  const [mtoErrors, setMtoErrors] = useState<Record<string, string>>({})

  // Set default category once categories are loaded (create mode only)
  useEffect(() => {
    if (!isEdit && !category && categoryNames.length > 0) {
      setCategory(categoryNames[0])
    }
  }, [categoryNames, isEdit, category])

  useEffect(() => {
    if (existing) {
      setName(existing.name ?? '')
      setDescription(existing.description ?? '')
      setCategory(existing.category ?? '')
      setActive(existing.active)
      setVariants(
        (existing.variants ?? []).map((v) => ({
          ...v,
          _key: String(v.id),
          _priceInput:   formatPriceInput(v.price_cents),
          _compareInput: formatPriceInput(v.compare_at_price_cents),
        }))
      )
      setWeightG(existing.weight_g != null ? String(existing.weight_g) : '')
      setHeightMm(existing.height_mm != null ? String(existing.height_mm) : '')
      setWidthMm(existing.width_mm != null ? String(existing.width_mm) : '')
      setLengthMm(existing.length_mm != null ? String(existing.length_mm) : '')
      setFulfillmentMode(existing.fulfillment_mode ?? 'from_stock')
      setLeadTimeDays(existing.production_lead_time_days != null ? String(existing.production_lead_time_days) : '')
      setProductionCapacity(existing.production_capacity != null ? String(existing.production_capacity) : '')
      setRefundPct(existing.cancellation_refund_percentage != null ? String(existing.cancellation_refund_percentage) : '')
    }
  }, [existing])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const activeVariants = variants.filter((v) => !v._destroy)

    const skus = activeVariants.map((v) => v.sku.trim())
    const uniqueSkus = new Set(skus)
    if (uniqueSkus.size !== skus.length) {
      toast.error('SKUs duplicados — cada variante precisa ter um SKU único')
      return
    }

    const missingSkus = activeVariants.some((v) => !v.sku.trim())
    if (missingSkus) {
      toast.error('Todas as variantes precisam ter um SKU')
      return
    }

    const missingPrices = activeVariants.filter((v) => !v._priceInput || v.price_cents == null)
    if (missingPrices.length > 0) {
      toast.error(`Defina o preço para: ${missingPrices.map((v) => v.size).join(', ')}`)
      return
    }

    // Validate made_to_order fields client-side
    const nextMtoErrors: Record<string, string> = {}
    let leadTimeNum: number | null = null
    let capacityNum: number | null = null
    let refundNum: number | null = null
    if (fulfillmentMode === 'made_to_order') {
      leadTimeNum = leadTimeDays ? parseInt(leadTimeDays) : NaN
      if (!Number.isInteger(leadTimeNum) || leadTimeNum <= 0) {
        nextMtoErrors.leadTime = 'Informe um número inteiro maior que zero'
      }
      capacityNum = productionCapacity ? parseInt(productionCapacity) : NaN
      if (!Number.isInteger(capacityNum) || capacityNum <= 0) {
        nextMtoErrors.capacity = 'Informe um número inteiro maior que zero'
      }
      refundNum = refundPct !== '' ? parseInt(refundPct) : NaN
      if (!Number.isInteger(refundNum) || refundNum < 0 || refundNum > 100) {
        nextMtoErrors.refund = 'Informe um valor entre 0 e 100'
      }
    }
    setMtoErrors(nextMtoErrors)
    if (Object.keys(nextMtoErrors).length > 0) {
      toast.error('Revise os campos de modalidade de venda')
      return
    }

    const variants_attributes = variants.map(
      ({ _key: _k, _priceInput: _pi, _compareInput: _ci, ...rest }) => rest,
    )

    // price_cents on the product is derived from the minimum variant price (backend compat)
    const price_cents = Math.min(...activeVariants.map((v) => v.price_cents ?? 0).filter(Boolean))

    const payload = {
      name, description, price_cents, category, active, variants_attributes,
      weight_g:  weightG  ? parseInt(weightG)  : null,
      height_mm: heightMm ? parseInt(heightMm) : null,
      width_mm:  widthMm  ? parseInt(widthMm)  : null,
      length_mm: lengthMm ? parseInt(lengthMm) : null,
      fulfillment_mode: fulfillmentMode,
      production_lead_time_days:      fulfillmentMode === 'made_to_order' ? leadTimeNum : null,
      production_capacity:            fulfillmentMode === 'made_to_order' ? capacityNum : null,
      cancellation_refund_percentage: fulfillmentMode === 'made_to_order' ? refundNum   : null,
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id: parseInt(id), data: payload })
        toast.success('Produto atualizado com sucesso')
      } else {
        const created = await createMutation.mutateAsync(payload)
        toast.success('Produto criado — adicione imagens abaixo')
        navigate(`/products/${created.id}/edit`)
        return
      }
    } catch (err) {
      // Surface backend validation messages — generic "Erro ao salvar"
      // hid real errors (e.g. "compare_at must be > price") and made the
      // admin click Save repeatedly with no clue what was wrong.
      let msg = 'Erro ao salvar produto'
      if (isAxiosError(err)) {
        const data = err.response?.data as { errors?: string[]; error?: string } | undefined
        if (data?.errors?.length) msg = data.errors.join(' · ')
        else if (data?.error) msg = data.error
      }
      toast.error(msg)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && isLoading) return <LoadingState />

  return (
    <div className="space-y-6">
      <PageTitle
        title={isEdit ? 'Editar Produto' : 'Novo Produto'}
        subtitle={isEdit ? existing?.name : 'Preencha os dados do produto'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      {/* Product details + variants in single form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="w-full">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do produto"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descrição curta"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Categoria</Label>
                <button
                  ref={manageTriggerRef}
                  type="button"
                  onClick={() => setManageCategoriesOpen(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Settings2 className="h-3 w-3" />
                  Gerenciar categorias
                </button>
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryNames.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CategoryManagerModal
              open={manageCategoriesOpen}
              onOpenChange={(v) => {
                setManageCategoriesOpen(v)
                if (!v) manageTriggerRef.current?.focus()
              }}
              onSaved={(autoSelectName) => {
                if (autoSelectName) setCategory(autoSelectName)
              }}
            />

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={active ? 'active' : 'inactive'}
                onValueChange={(v) => setActive(v === 'active')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Modalidade de venda */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Modalidade de venda</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Define como este produto será comercializado.
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fulfillment_mode"
                  value="from_stock"
                  checked={fulfillmentMode === 'from_stock'}
                  onChange={() => setFulfillmentMode('from_stock')}
                  className="mt-1"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Pronta entrega (estoque)</p>
                  <p className="text-xs text-muted-foreground">
                    Venda imediata a partir do estoque disponível.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="fulfillment_mode"
                  value="made_to_order"
                  checked={fulfillmentMode === 'made_to_order'}
                  onChange={() => setFulfillmentMode('made_to_order')}
                  className="mt-1"
                />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Sob encomenda (made-to-order)</p>
                  <p className="text-xs text-muted-foreground">
                    Produção iniciada após confirmação do pedido.
                  </p>
                </div>
              </label>
            </div>

            {fulfillmentMode === 'made_to_order' && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="space-y-1.5">
                  <Label htmlFor="lead_time">Prazo de produção (dias)</Label>
                  <Input
                    id="lead_time"
                    type="number"
                    min={1}
                    placeholder="ex: 14"
                    value={leadTimeDays}
                    onChange={(e) => setLeadTimeDays(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tempo estimado entre o pedido e a conclusão da peça.
                  </p>
                  {mtoErrors.leadTime && (
                    <p className="text-xs text-destructive font-medium">{mtoErrors.leadTime}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="production_capacity">Capacidade de produção (peças simultâneas)</Label>
                  <Input
                    id="production_capacity"
                    type="number"
                    min={1}
                    placeholder="ex: 5"
                    value={productionCapacity}
                    onChange={(e) => setProductionCapacity(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Quantas peças cabem em produção ao mesmo tempo.
                  </p>
                  {mtoErrors.capacity && (
                    <p className="text-xs text-destructive font-medium">{mtoErrors.capacity}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="refund_pct">Reembolso em caso de cancelamento (%)</Label>
                  <Input
                    id="refund_pct"
                    type="number"
                    min={0}
                    max={100}
                    placeholder="ex: 50"
                    value={refundPct}
                    onChange={(e) => setRefundPct(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Percentual do valor pago devolvido se o cliente cancelar com a peça já em produção. 0–100.
                  </p>
                  {mtoErrors.refund && (
                    <p className="text-xs text-destructive font-medium">{mtoErrors.refund}</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Variants */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Variantes e Estoque Inicial
            </CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <VariantTable
              variants={variants}
              productName={name}
              onChange={setVariants}
            />
          </CardContent>
        </Card>

        {/* Dimensões logísticas */}
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dimensões para Frete</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Necessário para cálculo automático via Melhor Envio.
              Peso em gramas (g), dimensões em milímetros (mm).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Peso (g)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="ex: 250"
                  value={weightG}
                  onChange={(e) => setWeightG(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Altura (mm)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="ex: 30"
                  value={heightMm}
                  onChange={(e) => setHeightMm(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Largura (mm)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="ex: 200"
                  value={widthMm}
                  onChange={(e) => setWidthMm(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Comprimento (mm)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="ex: 300"
                  value={lengthMm}
                  onChange={(e) => setLengthMm(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : isEdit ? (
              'Salvar alterações'
            ) : (
              'Criar produto'
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/products')}>
            Cancelar
          </Button>
        </div>
      </form>

      {/* Image management — only available after product is saved */}
      {isEdit && existing && (
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Imagens do Produto</CardTitle>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <ProductImageUploader
              productId={existing.id}
              images={existing.images}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

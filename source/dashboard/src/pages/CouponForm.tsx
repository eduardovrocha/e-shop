import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Loader2, Lock, Download, Plus } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/useToast'
import {
  useCoupon, useCreateCoupon, useUpdateCoupon, useGenerateCodes,
} from '@/hooks/useCoupons'
import { productsService } from '@/services/productsService'
import type {
  CodeType, CouponDetail, CouponWritePayload, ScopeType,
} from '@/types/coupon'
import { useQuery } from '@tanstack/react-query'

interface ProductLite { id: number; name: string }

function emptyForm(): Required<Omit<CouponWritePayload, 'product_ids'>> & { product_ids: number[] } {
  return {
    name:                  '',
    discount_percent:      10,
    applies_to_sale_items: false,
    code_type:             'public',
    public_code:           '',
    scope_type:            'all_products',
    starts_at:             '',
    expires_at:            '',
    total_usage_limit:     null,
    per_customer_limit:    null,
    active:                true,
    product_ids:           [],
  }
}

function toIsoOrNull(localValue: string): string | null {
  if (!localValue) return null
  // Local datetime-input returns "YYYY-MM-DDTHH:mm" without timezone; treat as local time.
  return new Date(localValue).toISOString()
}

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const tz = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - tz).toISOString().slice(0, 16)
}

function extractError(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const data = err.response?.data as { error?: string; errors?: string[] } | undefined
    if (data?.errors?.length) return data.errors.join(', ')
    return data?.error ?? fallback
  }
  return fallback
}

export default function CouponForm() {
  const { id }   = useParams<{ id?: string }>()
  const numericId = id ? Number(id) : undefined
  const isEdit    = Boolean(numericId)
  const navigate  = useNavigate()
  const toast     = useToast()

  const { data: existing, isLoading: loadingDetail } = useCoupon(numericId)
  const createMutation = useCreateCoupon()
  const updateMutation = useUpdateCoupon(numericId ?? 0)
  const generateMutation = useGenerateCodes(numericId ?? 0)

  // Product picker — for scope='specific_products'. Fetches once per session
  // and caches; the picker uses simple checkbox grid (fine for the catalog
  // sizes Andrequicé runs today).
  const { data: productsResp } = useQuery({
    queryKey: ['products', { per_page: 200 }],
    queryFn:  () => productsService.list({ per_page: 200 }),
    staleTime: 300_000,
  })
  const products: ProductLite[] = useMemo(
    () => productsResp?.products?.map((p) => ({ id: p.id, name: p.name })) ?? [],
    [productsResp],
  )

  const [form, setForm] = useState(emptyForm())
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [codeQty, setCodeQty] = useState(50)
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null)

  // Hydrate the form from the loaded coupon (edit mode only).
  useEffect(() => {
    if (!existing) return
    setForm({
      name:                  existing.name,
      discount_percent:      existing.discount_percent,
      applies_to_sale_items: existing.applies_to_sale_items,
      code_type:             existing.code_type,
      public_code:           existing.public_code ?? '',
      scope_type:            existing.scope_type,
      starts_at:             existing.starts_at ?? '',
      expires_at:            existing.expires_at ?? '',
      total_usage_limit:     existing.total_usage_limit,
      per_customer_limit:    existing.per_customer_limit,
      active:                existing.active,
      product_ids:           existing.product_ids,
    })
  }, [existing])

  const immutableFields: string[] = existing?.immutable_fields ?? []
  const locked = (field: string) => immutableFields.includes(field)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    const payload: CouponWritePayload = {
      name:                  form.name.trim(),
      discount_percent:      Number(form.discount_percent),
      applies_to_sale_items: form.applies_to_sale_items,
      code_type:             form.code_type,
      public_code:           form.code_type === 'public' ? form.public_code.trim().toUpperCase() : null,
      scope_type:            form.scope_type,
      starts_at:             toIsoOrNull(form.starts_at as unknown as string),
      expires_at:            toIsoOrNull(form.expires_at as unknown as string),
      total_usage_limit:     form.total_usage_limit,
      per_customer_limit:    form.per_customer_limit,
      active:                form.active,
      product_ids:           form.scope_type === 'specific_products' ? form.product_ids : [],
    }

    try {
      let saved: CouponDetail
      if (isEdit && numericId) {
        // Strip locked fields from the payload — backend would 422 anyway,
        // but skipping them keeps the request clean.
        const clean: CouponWritePayload = { ...payload }
        for (const field of immutableFields) delete (clean as Record<string, unknown>)[field]
        saved = await updateMutation.mutateAsync(clean)
        toast.success('Cupom atualizado.')
      } else {
        saved = await createMutation.mutateAsync(payload)
        toast.success('Cupom criado.')
        // Stay on edit mode of the new coupon — admin may want to generate codes.
        navigate(`/coupons/${saved.id}/edit`, { replace: true })
      }
    } catch (err) {
      toast.error(extractError(err, 'Erro ao salvar cupom.'))
    }
  }

  async function handleGenerate() {
    try {
      const result = await generateMutation.mutateAsync(codeQty)
      setGeneratedCodes(result.codes)
      toast.success(`${result.generated} códigos gerados.`)
    } catch (err) {
      toast.error(extractError(err, 'Erro ao gerar códigos.'))
    }
  }

  function downloadCsv() {
    if (!generatedCodes) return
    const csv = `code\n${generatedCodes.join('\n')}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `coupon-${numericId}-codes-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isEdit && loadingDetail) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
  }

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <PageTitle
        title={isEdit ? `Editar cupom${existing ? ` — ${existing.name}` : ''}` : 'Novo cupom'}
        subtitle="Cupons de desconto percentual."
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome interno</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount">
                Desconto (%) {locked('discount_percent') && <LockChip />}
              </Label>
              <Input
                id="discount"
                type="number"
                min={1}
                max={100}
                value={form.discount_percent}
                onChange={(e) => setForm((p) => ({ ...p, discount_percent: Number(e.target.value) }))}
                disabled={locked('discount_percent')}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              />
              Ativo
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Código de resgate</CardTitle>
            <CardDescription>
              Público compartilhado ou lote de códigos únicos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <fieldset className="flex gap-4" disabled={locked('code_type')}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="code_type"
                  checked={form.code_type === 'public'}
                  onChange={() => setForm((p) => ({ ...p, code_type: 'public' as CodeType }))}
                />
                Código público
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="code_type"
                  checked={form.code_type === 'unique'}
                  onChange={() => setForm((p) => ({ ...p, code_type: 'unique' as CodeType, public_code: '' }))}
                />
                Códigos únicos
              </label>
              {locked('code_type') && <LockChip />}
            </fieldset>

            {form.code_type === 'public' && (
              <div className="space-y-1.5">
                <Label htmlFor="public_code">
                  Código (case-insensitive) {locked('public_code') && <LockChip />}
                </Label>
                <Input
                  id="public_code"
                  value={form.public_code}
                  onChange={(e) => setForm((p) => ({ ...p, public_code: e.target.value }))}
                  disabled={locked('public_code')}
                  placeholder="WELCOME10"
                  required
                />
              </div>
            )}

            {form.code_type === 'unique' && isEdit && (
              <div className="rounded-md border border-dashed p-3 text-sm">
                <p className="mb-2">
                  Total gerado: <strong>{existing?.unique_codes_count ?? 0}</strong>
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => { setGeneratedCodes(null); setShowCodeModal(true) }}>
                  <Plus className="mr-1 h-4 w-4" />
                  Gerar códigos em lote
                </Button>
              </div>
            )}

            {form.code_type === 'unique' && !isEdit && (
              <p className="text-xs text-muted-foreground">
                Códigos únicos podem ser gerados após salvar o cupom.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Escopo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <fieldset className="flex gap-4" disabled={locked('scope_type')}>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope_type"
                  checked={form.scope_type === 'all_products'}
                  onChange={() => setForm((p) => ({ ...p, scope_type: 'all_products' as ScopeType }))}
                />
                Todos os produtos
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="scope_type"
                  checked={form.scope_type === 'specific_products'}
                  onChange={() => setForm((p) => ({ ...p, scope_type: 'specific_products' as ScopeType }))}
                />
                Produtos específicos
              </label>
              {locked('scope_type') && <LockChip />}
            </fieldset>

            {form.scope_type === 'specific_products' && (
              <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-md border p-2 md:grid-cols-2">
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.product_ids.includes(p.id)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          product_ids: e.target.checked
                            ? [...prev.product_ids, p.id]
                            : prev.product_ids.filter((id) => id !== p.id),
                        }))
                      }
                    />
                    {p.name}
                  </label>
                ))}
                {products.length === 0 && (
                  <p className="text-xs text-muted-foreground">Carregando catálogo…</p>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.applies_to_sale_items}
                disabled={locked('applies_to_sale_items')}
                onChange={(e) => setForm((p) => ({ ...p, applies_to_sale_items: e.target.checked }))}
              />
              Aplica em produtos em promoção (com <code>compare_at_price</code>)
              {locked('applies_to_sale_items') && <LockChip />}
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Validade e limites</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="starts_at">Início (opcional)</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={toLocalInput(form.starts_at as unknown as string)}
                onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expires_at">Fim (opcional)</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={toLocalInput(form.expires_at as unknown as string)}
                onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="total_usage_limit">Limite total (vazio = sem limite)</Label>
              <Input
                id="total_usage_limit"
                type="number"
                min={1}
                value={form.total_usage_limit ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, total_usage_limit: e.target.value ? Number(e.target.value) : null }))}
              />
              <p className="text-xs text-muted-foreground">
                Número máximo de resgates somando todos os clientes. Quando atingir
                esse total, o cupom passa para o status <strong>Esgotado</strong>{' '}
                e o checkout deixa de aceitá-lo. Deixe em branco para uso ilimitado.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="per_customer_limit">Limite por cliente (vazio = sem limite)</Label>
              <Input
                id="per_customer_limit"
                type="number"
                min={1}
                value={form.per_customer_limit ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, per_customer_limit: e.target.value ? Number(e.target.value) : null }))}
              />
              <p className="text-xs text-muted-foreground">
                Quantas vezes o <strong>mesmo e-mail</strong> pode resgatar este cupom.
                A contagem usa o e-mail informado no checkout (sem necessidade de login).
                Deixe em branco para permitir uso repetido pelo mesmo cliente.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/coupons')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            {isEdit ? 'Salvar alterações' : 'Criar cupom'}
          </Button>
        </div>
      </form>

      <Dialog
        open={showCodeModal}
        onOpenChange={(open) => { setShowCodeModal(open); if (!open) setGeneratedCodes(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar códigos únicos</DialogTitle>
            <DialogDescription>
              Códigos alfanuméricos de 10 caracteres, únicos no sistema.
            </DialogDescription>
          </DialogHeader>

          {!generatedCodes && (
            <div className="space-y-2">
              <Label htmlFor="qty">Quantidade (1 — 1000)</Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={1000}
                value={codeQty}
                onChange={(e) => setCodeQty(Number(e.target.value))}
              />
            </div>
          )}

          {generatedCodes && (
            <div className="space-y-2">
              <p className="text-sm">{generatedCodes.length} códigos gerados:</p>
              <textarea
                readOnly
                rows={8}
                value={generatedCodes.join('\n')}
                className="w-full rounded-md border bg-muted/30 p-2 font-mono text-xs"
              />
            </div>
          )}

          <DialogFooter>
            {generatedCodes ? (
              <>
                <Button variant="outline" onClick={() => setShowCodeModal(false)}>Fechar</Button>
                <Button onClick={downloadCsv}>
                  <Download className="mr-1 h-4 w-4" />
                  Exportar CSV
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowCodeModal(false)}>Cancelar</Button>
                <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                  {generateMutation.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  Gerar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LockChip() {
  return (
    <span
      className="ml-2 inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground"
      title="Bloqueado após o primeiro uso do cupom"
    >
      <Lock className="h-3 w-3" />
      Bloqueado
    </span>
  )
}

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Pencil, History, Loader2 } from 'lucide-react'
import { isAxiosError } from 'axios'
import { PageTitle } from '@/components/PageTitle'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/useToast'
import { useCoupons, useDeleteCoupon } from '@/hooks/useCoupons'
import type { CodeType, CouponStatus, CouponSummary } from '@/types/coupon'

const STATUS_LABEL: Record<CouponStatus, string> = {
  active:    'Ativo',
  inactive:  'Inativo',
  expired:   'Expirado',
  scheduled: 'Agendado',
  exhausted: 'Esgotado',
}

const STATUS_VARIANT: Record<CouponStatus, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  active:    'success',
  inactive:  'secondary',
  expired:   'destructive',
  scheduled: 'warning',
  exhausted: 'destructive',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function describeCode(c: CouponSummary): string {
  if (c.code_type === 'public') return c.public_code ?? '—'
  return `${c.unique_codes_count ?? 0} códigos únicos`
}

function describeScope(c: CouponSummary): string {
  if (c.scope_type === 'all_products') return 'Todos os produtos'
  return `${c.scope_products_count ?? 0} produtos`
}

function describeUsage(c: CouponSummary): string {
  if (c.total_usage_limit === null) return `${c.usages_count} / ∞`
  return `${c.usages_count} / ${c.total_usage_limit}`
}

export default function Coupons() {
  const navigate = useNavigate()
  const toast    = useToast()
  const [statusFilter, setStatusFilter] = useState<CouponStatus | ''>('')
  const [codeFilter, setCodeFilter]     = useState<CodeType | ''>('')

  const { data: coupons, isLoading, error } = useCoupons({
    ...(statusFilter && { status: statusFilter }),
    ...(codeFilter   && { code_type: codeFilter }),
  })
  const deleteMutation = useDeleteCoupon()

  async function handleDelete(coupon: CouponSummary) {
    const ok = window.confirm(`Apagar o cupom "${coupon.name}"? Esta ação não pode ser desfeita.`)
    if (!ok) return

    try {
      await deleteMutation.mutateAsync(coupon.id)
      toast.success('Cupom removido.')
    } catch (err) {
      let msg = 'Falha ao remover o cupom.'
      if (isAxiosError(err)) {
        msg = (err.response?.data as { error?: string })?.error ?? msg
      }
      toast.error(msg)
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle
        title="Cupons"
        subtitle="Gerencie cupons promocionais percentuais."
        actions={
          <Button onClick={() => navigate('/coupons/new')}>
            <Plus className="mr-1 h-4 w-4" />
            Novo cupom
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CouponStatus | '')}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todos os status</option>
          <option value="active">Ativo</option>
          <option value="inactive">Inativo</option>
          <option value="expired">Expirado</option>
          <option value="scheduled">Agendado</option>
          <option value="exhausted">Esgotado</option>
        </select>
        <select
          value={codeFilter}
          onChange={(e) => setCodeFilter(e.target.value as CodeType | '')}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="public">Código público</option>
          <option value="unique">Códigos únicos</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="py-6 text-sm text-destructive">
            Não foi possível carregar os cupons.
          </CardContent>
        </Card>
      )}

      {coupons && coupons.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum cupom encontrado. Crie o primeiro para começar.
          </CardContent>
        </Card>
      )}

      {coupons && coupons.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2">%</th>
                  <th className="px-4 py-2">Escopo</th>
                  <th className="px-4 py-2">Validade</th>
                  <th className="px-4 py-2">Usos</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2 font-medium">{c.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{describeCode(c)}</td>
                    <td className="px-4 py-2 tabular-nums">{c.discount_percent}%</td>
                    <td className="px-4 py-2">{describeScope(c)}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {formatDate(c.starts_at)} → {formatDate(c.expires_at)}
                    </td>
                    <td className="px-4 py-2 tabular-nums">{describeUsage(c)}</td>
                    <td className="px-4 py-2">
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/coupons/${c.id}/usages`} aria-label="Ver usos">
                            <History className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link to={`/coupons/${c.id}/edit`} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMutation.isPending}
                          aria-label="Apagar"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

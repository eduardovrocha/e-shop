import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Loader2, ArrowLeft } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCoupon, useCouponUsages } from '@/hooks/useCoupons'

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function CouponUsages() {
  const { id } = useParams<{ id: string }>()
  const couponId = Number(id)

  const [page, setPage] = useState(1)
  const [emailFilter, setEmailFilter] = useState('')

  const { data: coupon }   = useCoupon(couponId)
  const { data, isLoading } = useCouponUsages(couponId, page, emailFilter ? { email: emailFilter } : {})

  return (
    <div className="space-y-4">
      <PageTitle
        title={`Usos do cupom${coupon ? ` — ${coupon.name}` : ''}`}
        subtitle="Histórico de pedidos que aplicaram este cupom."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/coupons">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar à lista
            </Link>
          </Button>
        }
      />

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="Filtrar por e-mail (contém)"
          value={emailFilter}
          onChange={(e) => { setEmailFilter(e.target.value); setPage(1) }}
          className="max-w-sm"
        />
      </div>

      {isLoading && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {data && data.usages.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum uso registrado para este filtro.
          </CardContent>
        </Card>
      )}

      {data && data.usages.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-2">Quando</th>
                  <th className="px-4 py-2">E-mail</th>
                  <th className="px-4 py-2">Pedido</th>
                  <th className="px-4 py-2">Código</th>
                  <th className="px-4 py-2 text-right">Desconto</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.usages.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{formatDateTime(u.created_at)}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">
                      {u.order_id ? (
                        <Link to={`/orders/${u.order_id}`} className="text-primary hover:underline">
                          {u.order_number ?? `#${u.order_id}`}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{u.code_used ?? '—'}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatPrice(u.discount_amount_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Página {data.page} de {data.total_pages} — {data.total} usos
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={page >= data.total_pages} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

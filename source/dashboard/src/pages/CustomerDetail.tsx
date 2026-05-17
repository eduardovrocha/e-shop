import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, MapPin, Phone, ShoppingBag } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '@/lib/utils'
import { useCustomer } from '@/hooks/useCustomers'

export default function CustomerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const customerId = id ? parseInt(id, 10) : null

  const { data: customer, isLoading } = useCustomer(customerId)

  if (isLoading) return <LoadingState />
  if (!customer) return <p className="p-6 text-muted-foreground">Cliente não encontrado.</p>

  const orders = customer.orders ?? []
  const addresses = customer.addresses ?? []

  return (
    <div className="space-y-6">
      <PageTitle
        title={customer.name}
        subtitle={`Cliente desde ${formatDate(customer.created_at)}`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{formatPhone(customer.phone)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ShoppingBag className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                {customer.orders_count} pedido{customer.orders_count !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total Gasto</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-brand-gold">
              {formatCurrency(customer.total_spent_cents)}
            </p>
            {customer.last_order_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Último pedido em {formatDate(customer.last_order_at)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-brand-navy">
              {customer.orders_count > 0
                ? formatCurrency(Math.round(customer.total_spent_cents / customer.orders_count))
                : '—'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">por pedido</p>
          </CardContent>
        </Card>
      </div>

      {addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Endereços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {addr.street}, {addr.number}
                    {addr.complement ? ` — ${addr.complement}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {addr.neighborhood} · {addr.city} / {addr.state} · {addr.zipcode}
                  </p>
                  {addr.is_default && (
                    <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-brand-navy">
                      Principal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              Nenhum pedido encontrado.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex cursor-pointer items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-muted-foreground">
                      {order.number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-semibold">
                      {formatCurrency(order.total_cents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

import {
  DollarSign,
  ShoppingBag,
  Package,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { MetricCard } from '@/components/MetricCard'
import { StatusBadge } from '@/components/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { useDashboardStats } from '@/hooks/useDashboard'

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats()

  const dash = (v: string) => (isLoading ? '—' : v)

  const alerts = [
    {
      label: 'Estoque baixo',
      count: isLoading ? '—' : String(stats?.low_stock_count ?? 0),
      icon: AlertTriangle,
      color: 'text-amber-500',
    },
    {
      label: 'Pedidos aguardando envio',
      count: isLoading ? '—' : String(stats?.awaiting_shipment_count ?? 0),
      icon: ShoppingBag,
      color: 'text-blue-500',
    },
    {
      label: 'Pagamentos pendentes',
      count: isLoading ? '—' : String(stats?.pending_orders_count ?? 0),
      icon: DollarSign,
      color: 'text-red-500',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Faturamento Total"
          value={dash(formatCurrency(stats?.revenue_cents ?? 0))}
          subtitle="Pedidos pagos"
          icon={DollarSign}
          accent="gold"
        />
        <MetricCard
          title="Pedidos Pagos"
          value={dash(String(stats?.paid_orders_count ?? 0))}
          subtitle="Confirmados"
          icon={ShoppingBag}
          accent="green"
        />
        <MetricCard
          title="Pedidos Pendentes"
          value={dash(String(stats?.pending_orders_count ?? 0))}
          subtitle="Aguardando pagamento"
          icon={TrendingUp}
          accent="amber"
        />
        <MetricCard
          title="Ticket Médio"
          value={dash(formatCurrency(stats?.average_ticket_cents ?? 0))}
          subtitle="Por pedido pago"
          icon={Package}
          accent="navy"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Vendas da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={stats?.weekly_sales ?? []}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4A261" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#D4A261" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0e8df" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `R$${v}`}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value * 100), 'Vendas']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e8d1b0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="vendas"
                  stroke="#D4A261"
                  strokeWidth={2}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))
              : (stats?.top_products ?? []).map((product, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">{product.name}</p>
                      <p className="text-[11px] text-muted-foreground">Tamanho {product.size}</p>
                    </div>
                    <span className="text-xs font-semibold text-brand-gold">{product.qty} un.</span>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pedidos Recentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                      <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                    </div>
                  ))
                : (stats?.recent_orders ?? []).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          {order.number}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {order.customer_name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(order.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={order.status} />
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(order.total_cents)}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map(({ label, count, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
              >
                <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                <p className="flex-1 text-xs font-medium text-foreground">{label}</p>
                <span className="text-sm font-bold text-foreground">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

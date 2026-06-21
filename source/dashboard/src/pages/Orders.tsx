import { useState } from 'react'
import { FileText, Loader2, Plus, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminPageGrid } from '@/components/AdminPageGrid'
import { PageTitle } from '@/components/PageTitle'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { OriginBadge } from '@/components/OriginBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { Order, OrderStatus } from '@/types/order'
import { useOrders } from '@/hooks/useOrders'
import { reportsService } from '@/services/reportsService'
import { useToast } from '@/hooks/useToast'

const STATUS_OPTIONS = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Pendente', value: 'pending' },
  { label: 'Pago', value: 'paid' },
  { label: 'Em produção', value: 'producing' },
  { label: 'Enviado', value: 'shipped' },
  { label: 'Entregue', value: 'delivered' },
  { label: 'Cancelado', value: 'cancelled' },
]

const ORIGIN_OPTIONS = [
  { label: 'Todas as origens', value: 'all' },
  { label: 'Site', value: 'web' },
  { label: 'Manual', value: 'manual' },
]

export default function Orders() {
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [reportLoading, setReportLoading] = useState(false)

  async function handleGenerateReport() {
    setReportLoading(true)
    try {
      const res = await reportsService.ordersPdf(statusFilter)
      const url = URL.createObjectURL(res.data as Blob)
      const a = document.createElement('a')
      a.href = url
      const slug = statusFilter === 'all' ? 'todos' : statusFilter
      a.download = `relatorio-pedidos-${slug}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Não foi possível gerar o relatório.')
    } finally {
      setReportLoading(false)
    }
  }

  const { data, isLoading } = useOrders({
    page,
    per_page: 10,
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    source: originFilter === 'all' ? undefined : originFilter,
  })

  const orders = data?.orders ?? []
  const meta = data?.meta

  const columns: Column<Order>[] = [
    {
      key: 'number',
      header: 'Pedido',
      render: (o) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">{o.number}</span>
      ),
    },
    {
      key: 'customer_name',
      header: 'Cliente',
      render: (o) => (
        <div>
          <p className="font-medium text-foreground">{o.customer_name}</p>
          <p className="text-[11px] text-muted-foreground">{o.customer_email}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (o) => <StatusBadge status={o.status as OrderStatus} />,
    },
    {
      key: 'source',
      header: 'Origem',
      render: (o) => <OriginBadge source={o.source} />,
    },
    {
      key: 'delivery_method',
      header: 'Entrega',
      render: (o) => (
        <span className="text-xs capitalize text-muted-foreground">
          {o.delivery_method === 'delivery' ? 'Entrega' : 'Retirada'}
        </span>
      ),
    },
    {
      key: 'total_cents',
      header: 'Valor',
      render: (o) => (
        <span className="font-semibold text-foreground">{formatCurrency(o.total_cents)}</span>
      ),
    },
  ]

  return (
    <AdminPageGrid>
      {/* col-span-full: título */}
      <div className="col-span-full flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTitle
          title="Pedidos"
          subtitle={meta ? `${meta.total_count} pedidos encontrados` : 'Carregando...'}
        />
        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            onClick={() => void handleGenerateReport()}
            disabled={reportLoading}
          >
            {reportLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Gerar relatório PDF
          </Button>
          <Button onClick={() => navigate('/orders/new')}>
            <Plus className="h-4 w-4" />
            Novo pedido
          </Button>
        </div>
      </div>

      {/* col-span-full: filtros */}
      <div className="col-span-full flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={originFilter}
          onValueChange={(v) => {
            setOriginFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ORIGIN_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* col-span-full: tabela */}
      <div className="col-span-full" data-tour="orders-table">
        <DataTable
          columns={columns}
          data={orders}
          keyExtractor={(o) => o.id}
          currentPage={page}
          totalPages={meta?.total_pages ?? 1}
          totalCount={meta?.total_count}
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage="Nenhum pedido encontrado"
          onRowClick={(o) => navigate(`/orders/${o.id}`)}
        />
      </div>
    </AdminPageGrid>
  )
}

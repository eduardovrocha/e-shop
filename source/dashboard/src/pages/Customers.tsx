import { useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminPageGrid } from '@/components/AdminPageGrid'
import { PageTitle } from '@/components/PageTitle'
import { DataTable, type Column } from '@/components/DataTable'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Customer } from '@/types/customer'
import { useCustomers } from '@/hooks/useCustomers'

export default function Customers() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useCustomers({ page, per_page: 10, search: search || undefined })

  const customers = data?.customers ?? []
  const meta = data?.meta

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c) => (
        <div>
          <p className="font-medium text-foreground">{c.name}</p>
          <p className="text-[11px] text-muted-foreground">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'orders_count',
      header: 'Pedidos',
      render: (c) => (
        <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-brand-navy/10 px-2 text-xs font-semibold text-brand-navy">
          {c.orders_count}
        </span>
      ),
    },
    {
      key: 'total_spent_cents',
      header: 'Total Gasto',
      render: (c) => (
        <span className="font-semibold text-foreground">{formatCurrency(c.total_spent_cents)}</span>
      ),
    },
    {
      key: 'last_order_at',
      header: 'Último Pedido',
      render: (c) => (
        <span className="text-xs text-muted-foreground">
          {c.last_order_at ? formatDate(c.last_order_at) : '—'}
        </span>
      ),
    },
  ]

  return (
    <AdminPageGrid>
      {/* col-span-full: título */}
      <div className="col-span-full">
        <PageTitle
          title="Clientes"
          subtitle={meta ? `${meta.total_count} clientes cadastrados` : 'Carregando...'}
        />
      </div>

      {/* col-span-full: filtros */}
      <div className="col-span-full">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>

      {/* col-span-full: tabela */}
      <div className="col-span-full" data-tour="customer-card">
        <DataTable
          columns={columns}
          data={customers}
          keyExtractor={(c) => String(c.id)}
          currentPage={page}
          totalPages={meta?.total_pages ?? 1}
          totalCount={meta?.total_count}
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage="Nenhum cliente encontrado"
          onRowClick={(c) => navigate(`/customers/${c.id}`)}
        />
      </div>
    </AdminPageGrid>
  )
}

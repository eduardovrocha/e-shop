import { useState } from 'react'
import { Search, Plus, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { AdminPageGrid } from '@/components/AdminPageGrid'
import { PageTitle } from '@/components/PageTitle'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types/product'
import { useProducts, useDeleteProduct } from '@/hooks/useProducts'
import { useToast } from '@/hooks/useToast'

export default function Products() {
  const navigate = useNavigate()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  const { data, isLoading } = useProducts({ page, per_page: 10, search: search || undefined })
  const deleteMutation = useDeleteProduct()

  const products = data?.products ?? []
  const meta = data?.meta

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" removido com sucesso`)
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao remover produto')
    }
  }

  const columns: Column<Product>[] = [
    {
      key: 'image',
      header: '',
      render: (p) => (
        <img
          src={p.images[0]?.thumb_url ?? `https://placehold.co/40x40/E8D1B0/0D2B45?text=${p.name.charAt(0)}`}
          alt={p.name}
          className="h-10 w-10 rounded-lg object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = `https://placehold.co/40x40/E8D1B0/0D2B45?text=${p.name.charAt(0)}`
          }}
        />
      ),
      className: 'w-14',
    },
    {
      key: 'name',
      header: 'Produto',
      render: (p) => (
        <div>
          <p className="font-medium text-foreground">{p.name}</p>
          <p className="text-[11px] capitalize text-muted-foreground">{p.category}</p>
        </div>
      ),
    },
    {
      key: 'price_cents',
      header: 'Preço',
      render: (p) => <span className="font-semibold">{formatCurrency(p.price_cents)}</span>,
    },
    {
      key: 'total_stock',
      header: 'Estoque',
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{p.total_stock} un.</span>
          {p.total_stock === 0 && (
            <Badge variant="destructive" className="text-[10px]">
              Zerado
            </Badge>
          )}
          {p.total_stock > 0 && p.total_stock <= 10 && (
            <Badge variant="warning" className="text-[10px]">
              Baixo
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (p) => <StatusBadge status={p.active ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar"
            onClick={() => navigate(`/products/${p.id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            title="Remover"
            onClick={() => setDeleteTarget(p)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <AdminPageGrid>
      {/* col-span-full: título */}
      <div className="col-span-full">
        <PageTitle
          title="Produtos"
          subtitle={meta ? `${meta.total_count} produtos cadastrados` : 'Carregando...'}
          actions={
            <Button size="sm" data-tour="products-new" onClick={() => navigate('/products/new')}>
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
          }
        />
      </div>

      {/* col-span-full: filtros */}
      <div className="col-span-full">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
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
      <div className="col-span-full">
        <DataTable
          columns={columns}
          data={products}
          keyExtractor={(p) => p.id}
          currentPage={page}
          totalPages={meta?.total_pages ?? 1}
          totalCount={meta?.total_count}
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage="Nenhum produto encontrado"
        />
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remover produto"
        description={`Tem certeza que deseja remover "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Remover"
        destructive
        onConfirm={handleDelete}
      />
    </AdminPageGrid>
  )
}

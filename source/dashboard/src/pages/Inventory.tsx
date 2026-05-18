import { useState } from 'react'
import { Search, Pencil, Check, X } from 'lucide-react'
import { AdminPageGrid } from '@/components/AdminPageGrid'
import { PageTitle } from '@/components/PageTitle'
import { DataTable, type Column } from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useInventory, useUpdateInventoryStock } from '@/hooks/useInventory'
import { useToast } from '@/hooks/useToast'
import type { VariantRow } from '@/services/inventoryService'

function StockBadge({ stock: _stock, available }: { stock: number; available: number }) {
  if (available === 0) return <Badge variant="destructive">Zerado</Badge>
  if (available <= 5) return <Badge variant="warning">Crítico ({available})</Badge>
  if (available <= 10) return <Badge variant="warning">Baixo ({available})</Badge>
  return <Badge variant="success">{available} disp.</Badge>
}

interface InlineStockEditorProps {
  row: VariantRow
  onSave: (newStock: number) => Promise<void>
}

function InlineStockEditor({ row, onSave }: InlineStockEditorProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(row.stock))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    const qty = parseInt(value)
    if (isNaN(qty) || qty < 0) return
    setSaving(true)
    try {
      await onSave(qty)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setValue(String(row.stock))
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleCancel()
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5 group">
        <span className="tabular-nums text-sm">{row.stock}</span>
        {row.reserved > 0 && (
          <span className="text-xs text-muted-foreground">({row.reserved} res.)</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          aria-label="Editar estoque"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-7 w-20 text-sm"
        autoFocus
        disabled={saving}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="text-green-600 hover:text-green-700 disabled:opacity-50"
        aria-label="Confirmar"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        onClick={handleCancel}
        disabled={saving}
        className="text-muted-foreground hover:text-foreground disabled:opacity-50"
        aria-label="Cancelar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const toast = useToast()

  const { data, isLoading } = useInventory({ page, per_page: 20, search: search || undefined })
  const updateStock = useUpdateInventoryStock()

  const variants = data?.variants ?? []
  const meta = data?.meta

  async function handleStockSave(row: VariantRow, newStock: number) {
    try {
      await updateStock.mutateAsync({
        productId: row.product_id,
        variantId: row.id,
        stockQuantity: newStock,
      })
      toast.success(`Estoque atualizado: ${row.product} (${row.size})`)
    } catch {
      toast.error('Erro ao atualizar estoque')
      throw new Error('failed')
    }
  }

  const columns: Column<VariantRow>[] = [
    {
      key: 'image',
      header: '',
      render: (v) => (
        <img
          src={`https://placehold.co/40x40/E8D1B0/0D2B45?text=${v.product.charAt(0)}`}
          alt={v.product}
          className="h-10 w-10 rounded-lg object-cover"
        />
      ),
      className: 'w-14',
    },
    {
      key: 'product',
      header: 'Produto',
      render: (v) => (
        <div>
          <p className="font-medium text-foreground">{v.product}</p>
          <p className="text-[11px] capitalize text-muted-foreground">
            {v.size}
            {v.color ? ` · ${v.color}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
      ),
    },
    {
      key: 'stock',
      header: 'Estoque',
      render: (v) => (
        <div className="flex items-center gap-2">
          <InlineStockEditor row={v} onSave={(qty) => handleStockSave(v, qty)} />
          {v.stock === 0 && (
            <Badge variant="destructive" className="text-[10px]">
              Zerado
            </Badge>
          )}
          {v.stock > 0 && v.stock <= 10 && (
            <Badge variant="warning" className="text-[10px]">
              Baixo
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'available',
      header: 'Disponível',
      render: (v) => <StockBadge stock={v.stock} available={v.available} />,
    },
  ]

  return (
    <AdminPageGrid>
      {/* col-span-full: título */}
      <div className="col-span-full">
        <PageTitle
          title="Estoque"
          subtitle={meta ? `${meta.total_count} variantes cadastradas` : 'Controle de variantes e quantidades'}
        />
      </div>

      {/* col-span-full: filtros */}
      <div className="col-span-full">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou SKU..."
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
      <div className="col-span-full" data-tour="inventory-row">
        <DataTable
          columns={columns}
          data={variants}
          keyExtractor={(v) => v.id}
          currentPage={page}
          totalPages={meta?.total_pages ?? 1}
          totalCount={meta?.total_count}
          onPageChange={setPage}
          loading={isLoading}
          emptyMessage="Nenhuma variante encontrada"
        />
      </div>
    </AdminPageGrid>
  )
}

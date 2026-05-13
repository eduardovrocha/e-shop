import { useState } from 'react'
import { Search, Pencil, Check, X } from 'lucide-react'
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
      key: 'product',
      header: 'Produto',
      render: (v) => <span className="font-medium text-foreground">{v.product}</span>,
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (v) => (
        <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
      ),
    },
    {
      key: 'size',
      header: 'Tamanho',
      render: (v) => (
        <span className="inline-flex h-6 w-8 items-center justify-center rounded border border-border text-xs font-semibold">
          {v.size}
        </span>
      ),
    },
    {
      key: 'color',
      header: 'Cor',
      render: (v) => <span className="text-sm text-muted-foreground">{v.color ?? '—'}</span>,
    },
    {
      key: 'stock',
      header: 'Estoque (total / reservado)',
      render: (v) => (
        <InlineStockEditor
          row={v}
          onSave={(qty) => handleStockSave(v, qty)}
        />
      ),
    },
    {
      key: 'available',
      header: 'Disponível',
      render: (v) => <StockBadge stock={v.stock} available={v.available} />,
    },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <PageTitle
        title="Estoque"
        subtitle={meta ? `${meta.total_count} variantes cadastradas` : 'Controle de variantes e quantidades'}
      />

      <div className="mb-4">
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

      <p className="text-xs text-muted-foreground -mt-4">
        Passe o mouse sobre o estoque para editar inline. Pressione Enter para confirmar ou Esc para cancelar.
      </p>

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
  )
}

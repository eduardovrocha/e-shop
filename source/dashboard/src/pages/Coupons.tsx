import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/PageTitle'
import { DataTable, type Column } from '@/components/DataTable'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Coupon } from '@/types/coupon'
import { useCoupons, useDeleteCoupon } from '@/hooks/useCoupons'
import { useToast } from '@/hooks/useToast'

export default function Coupons() {
  const navigate = useNavigate()
  const toast = useToast()
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null)

  const { data, isLoading } = useCoupons()
  const deleteMutation = useDeleteCoupon()

  const coupons = data?.coupons ?? []

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(`Cupom "${deleteTarget.code}" removido`)
      setDeleteTarget(null)
    } catch {
      toast.error('Erro ao remover cupom')
    }
  }

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Código',
      render: (c) => (
        <span className="font-mono text-sm font-bold tracking-widest text-brand-navy">
          {c.code}
        </span>
      ),
    },
    {
      key: 'discount_type',
      header: 'Desconto',
      render: (c) => (
        <Badge variant="brand">
          {c.discount_type === 'percentage'
            ? `${c.discount_value}%`
            : formatCurrency(c.discount_value)}
        </Badge>
      ),
    },
    {
      key: 'expires_at',
      header: 'Validade',
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {c.expires_at ? formatDate(c.expires_at) : 'Sem limite'}
        </span>
      ),
    },
    {
      key: 'used_count',
      header: 'Uso',
      render: (c) => (
        <span className="text-sm text-muted-foreground">
          {c.used_count}
          {c.usage_limit ? ` / ${c.usage_limit}` : ''}
        </span>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      render: (c) => <StatusBadge status={c.active ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            title="Editar"
            onClick={() => navigate(`/coupons/${c.id}/edit`)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 hover:text-destructive"
            title="Remover"
            onClick={() => setDeleteTarget(c)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageTitle
        title="Cupons"
        subtitle={`${coupons.length} cupons cadastrados`}
        actions={
          <Button size="sm" onClick={() => navigate('/coupons/new')}>
            <Plus className="h-4 w-4" />
            Novo cupom
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={coupons}
        keyExtractor={(c) => c.id}
        loading={isLoading}
        emptyMessage="Nenhum cupom cadastrado"
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Remover cupom"
        description={`Tem certeza que deseja remover o cupom "${deleteTarget?.code}"?`}
        confirmLabel="Remover"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  )
}

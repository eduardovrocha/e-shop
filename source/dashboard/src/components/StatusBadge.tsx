import type { OrderStatus } from '@/types/order'
import { Badge } from './ui/badge'

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info' | 'default' }> = {
  // Order statuses
  pending:          { label: 'Pendente',          variant: 'warning' },
  paid:             { label: 'Pago',              variant: 'success' },
  processing:       { label: 'Em processamento',  variant: 'info' },
  producing:        { label: 'Em produção',        variant: 'info' },
  packed:           { label: 'Embalado',           variant: 'info' },
  shipped:          { label: 'Enviado',            variant: 'info' },
  out_for_delivery: { label: 'Saiu p/ entrega',   variant: 'info' },
  delivered:        { label: 'Entregue',           variant: 'success' },
  cancelled:        { label: 'Cancelado',          variant: 'destructive' },
  refunded:         { label: 'Reembolsado',        variant: 'secondary' },
  failed:           { label: 'Falhou',             variant: 'destructive' },
  disputed:         { label: 'Em disputa',         variant: 'warning' },
  // Inventory statuses
  active:    { label: 'Ativo',           variant: 'success' },
  inactive:  { label: 'Inativo',         variant: 'secondary' },
  low:       { label: 'Estoque baixo',   variant: 'warning' },
  out:       { label: 'Sem estoque',     variant: 'destructive' },
}

interface StatusBadgeProps {
  status: OrderStatus | string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: 'secondary' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

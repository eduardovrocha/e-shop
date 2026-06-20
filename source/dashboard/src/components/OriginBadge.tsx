import { Badge } from '@/components/ui/badge'
import { ORDER_SOURCE_LABELS, type OrderSource } from '@/lib/manualOrder'

interface OriginBadgeProps {
  source: OrderSource | string | undefined | null
}

// Badge de origem do pedido na listagem: Site (web) ou Manual.
export function OriginBadge({ source }: OriginBadgeProps) {
  const normalized: OrderSource = source === 'manual' ? 'manual' : 'web'
  return (
    <Badge variant={normalized === 'manual' ? 'brand' : 'secondary'}>
      {ORDER_SOURCE_LABELS[normalized]}
    </Badge>
  )
}

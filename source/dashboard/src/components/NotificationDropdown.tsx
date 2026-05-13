import { useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { OrderNotification, ConnectionStatus } from '@/hooks/useOrderNotifications'

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 5)    return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const STATUS_LABELS: Record<string, string> = {
  paid:             'Novo pedido',
  pending:          'Aguardando pagamento',
  processing:       'Em processamento',
  producing:        'Em produção',
  packed:           'Embalado',
  shipped:          'Enviado',
  out_for_delivery: 'Saiu para entrega',
  delivered:        'Entregue',
  cancelled:        'Cancelado',
  failed:           'Falha no pagamento',
  refunded:         'Estornado',
  disputed:         'Disputado',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'warning' | 'success'> = {
  paid:     'default',
  pending:  'warning',
  shipped:  'success',
  failed:   'destructive',
  cancelled: 'destructive',
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
  orders: OrderNotification[]
  unreadCount: number
  connectionStatus: ConnectionStatus
  markAsRead: (id: number) => void
  markAllAsRead: () => void
  triggerRef: React.RefObject<HTMLButtonElement>
}

export function NotificationDropdown({
  open,
  onClose,
  orders,
  unreadCount,
  connectionStatus,
  markAsRead,
  markAllAsRead,
  triggerRef,
}: Props) {
  const navigate    = useNavigate()
  const panelRef    = useRef<HTMLDivElement>(null)
  const visible     = orders.slice(0, 10)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: PointerEvent) {
      if (
        !panelRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open, onClose, triggerRef])

  // Close on Esc
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); triggerRef.current?.focus() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose, triggerRef])

  // Auto-mark visible unread as read when panel opens
  useEffect(() => {
    if (!open) return
    visible.filter((o) => !o.isRead).forEach((o) => markAsRead(o.id))
  // Only run when panel opens, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleOrderClick = useCallback((id: number) => {
    markAsRead(id)
    navigate(`/orders/${id}`)
    onClose()
  }, [markAsRead, navigate, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Notificações de pedidos"
      className="absolute right-0 top-full z-50 mt-2 w-80 origin-top-right animate-in fade-in-0 zoom-in-95 rounded-xl border border-border bg-card shadow-lg"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Novos pedidos</span>
          {unreadCount > 0 && (
            <Badge variant="default" className="h-5 px-1.5 text-[10px]">
              {unreadCount}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            marcar todos como lido
          </button>
        )}
      </div>

      {/* ── List ───────────────────────────────────────────────────────────── */}
      <ul
        role="list"
        className="max-h-[380px] overflow-y-auto divide-y divide-border/60"
      >
        {visible.length === 0 ? (
          <li className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <ShoppingBag className="h-6 w-6 opacity-30" />
            Nenhum pedido recebido ainda
          </li>
        ) : (
          visible.map((order) => (
            <li key={order.id}>
              <button
                type="button"
                onClick={() => handleOrderClick(order.id)}
                className={[
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                  !order.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : '',
                ].join(' ')}
              >
                {/* Unread indicator */}
                <span
                  className={[
                    'mt-1.5 h-2 w-2 shrink-0 rounded-full transition-opacity',
                    !order.isRead ? 'bg-blue-500 opacity-100' : 'opacity-0',
                  ].join(' ')}
                />

                {/* Icon */}
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-navy/10 text-brand-navy">
                  <ShoppingBag className="h-4 w-4" />
                </span>

                {/* Content */}
                <span className="flex flex-1 flex-col gap-0.5 min-w-0">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {order.number ?? `#${order.id}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {relativeTime(order.receivedAt)}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {order.customer} · {order.items} {order.items === 1 ? 'item' : 'itens'} · R$ {order.total.toFixed(2).replace('.', ',')}
                  </span>
                  <Badge
                    variant={STATUS_VARIANT[order.status] ?? 'secondary'}
                    className="mt-1 w-fit text-[10px] h-4 px-1.5"
                  >
                    {STATUS_LABELS[order.status] ?? order.status}
                  </Badge>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-4 py-2.5">
        <button
          type="button"
          onClick={() => { navigate('/orders'); onClose() }}
          className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Ver todos os pedidos
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

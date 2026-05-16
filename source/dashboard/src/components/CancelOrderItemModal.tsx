import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { useCancelOrderItem } from '@/hooks/useOrderItems'
import { useToast } from '@/hooks/useToast'
import { formatCurrency } from '@/lib/utils'

interface CancelOrderItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string | null
  itemId: number
  itemName: string
  size: string | null
  quantity: number
  subtotalCents: number
  refundPercentage: number
  productionStatus: string
  onSuccess?: () => void
}

const STATUS_LABELS: Record<string, string> = {
  pending:       'Pendente',
  paid:          'Pago (na fila)',
  in_production: 'Em produção',
  ready_to_ship: 'Pronto para envio',
  shipped:       'Enviado',
  delivered:     'Entregue',
  canceled:      'Cancelado',
}

export function CancelOrderItemModal({
  open,
  onOpenChange,
  orderNumber,
  itemId,
  itemName,
  size,
  quantity,
  subtotalCents,
  refundPercentage,
  productionStatus,
  onSuccess,
}: CancelOrderItemModalProps) {
  const toast = useToast()
  const cancelMutation = useCancelOrderItem()
  const [reason, setReason] = useState('')

  const refundCents = Math.round((subtotalCents * refundPercentage) / 100)
  const retainedCents = subtotalCents - refundCents

  async function handleConfirm() {
    try {
      const result = await cancelMutation.mutateAsync({ id: itemId, reason: reason.trim() || undefined })
      toast.success(
        `Item cancelado. Reembolso de ${formatCurrency(result.refund_amount_cents)} processado.`
      )
      setReason('')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string; message?: string } } }
      const status = axiosError?.response?.status
      const error  = axiosError?.response?.data?.error
      const msg    = axiosError?.response?.data?.message
      if (status === 502 || error === 'stripe_refund_failed') {
        toast.error(`Erro no Stripe: ${msg ?? 'Não foi possível processar o reembolso.'}`)
      } else if (error === 'invalid_transition') {
        toast.error(`O item não pode ser cancelado neste estado: ${msg ?? ''}`)
      } else {
        toast.error('Falha ao cancelar item. Tente novamente.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={cancelMutation.isPending ? () => {} : onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar item do pedido</DialogTitle>
          <DialogDescription>
            {orderNumber ? `Pedido ${orderNumber}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium">{itemName}{size ? ` — Tamanho ${size}` : ''}</p>
            <p className="text-xs text-muted-foreground">Quantidade: {quantity}</p>
            <p className="text-xs text-muted-foreground">
              Status atual: {STATUS_LABELS[productionStatus] ?? productionStatus}
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Cálculo do reembolso
            </p>
            <div className="flex justify-between text-sm">
              <span>Valor pago do item</span>
              <span className="tabular-nums">{formatCurrency(subtotalCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Política do produto</span>
              <span className="tabular-nums">{refundPercentage}%</span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-foreground">
              <span>Reembolso ao cliente</span>
              <span className="tabular-nums">{formatCurrency(refundCents)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Loja retém</span>
              <span className="tabular-nums">{formatCurrency(retainedCents)}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            ⚠ O frete não é reembolsado em cancelamentos parciais. Se este for o último item ativo
            do pedido, o pedido será marcado como cancelado.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Anotação interna para o histórico do pedido"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Processando...' : 'Confirmar cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

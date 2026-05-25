import { useState, useEffect } from 'react'
import { Button } from '@/components/Button'
import { trackingService, type TrackingOrderItem } from '@/services/trackingService'
import { formatPrice } from '@/lib/utils'
import { formatVariantLine } from '@/utils/variant'

interface CancelTrackingItemModalProps {
  open: boolean
  token: string
  item: TrackingOrderItem | null
  onClose: () => void
  onCanceled: () => void
}

const STATUS_LABELS: Record<string, string> = {
  paid:          'Aguardando produção',
  in_production: 'Em produção',
  ready_to_ship: 'Pronta para envio',
  shipped:       'Enviada',
  delivered:     'Entregue',
  canceled:      'Cancelada',
  pending:       'Pendente',
}

export function CancelTrackingItemModal({
  open, token, item, onClose, onCanceled,
}: CancelTrackingItemModalProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setReason('')
      setError(null)
      setSubmitting(false)
    }
  }, [open])

  if (!open || !item) return null

  const percentage   = item.cancellation_refund_percentage ?? 0
  const refundCents  = Math.round((item.subtotal_cents * percentage) / 100)

  async function handleConfirm() {
    if (!item) return
    setSubmitting(true)
    setError(null)
    try {
      await trackingService.cancelItem(token, item.id, reason.trim() || undefined)
      onCanceled()
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string; message?: string } } }
      const status = axiosError?.response?.status
      const errCode = axiosError?.response?.data?.error
      if (status === 502 || errCode === 'stripe_refund_failed') {
        setError('Não foi possível processar o reembolso no momento. Tente novamente em instantes.')
      } else if (errCode === 'invalid_transition') {
        setError('Este item não pode mais ser cancelado.')
      } else if (errCode === 'from_stock_cancellation_not_supported') {
        setError('Este item não pode ser cancelado online. Entre em contato conosco.')
      } else {
        setError('Não foi possível cancelar o item. Tente novamente.')
      }
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-tracking-item-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h2 id="cancel-tracking-item-title" className="font-serif text-xl text-andrequice-navy">
            Cancelar este item?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Fechar"
            className="text-andrequice-border hover:text-andrequice-navy disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-1">
          <p className="font-medium text-andrequice-navy">
            {item.name}
            {(() => {
              const descriptors = formatVariantLine({
                gender:    item.gender,
                cut:       item.cut,
                size:      item.size,
                sizeLabel: 'Tamanho',
              })
              return descriptors ? ` — ${descriptors}` : ''
            })()}
          </p>
          <p className="text-xs text-andrequice-border">Quantidade: {item.quantity}</p>
          <p className="text-xs text-andrequice-border">
            Status: {STATUS_LABELS[item.production_status] ?? item.production_status}
          </p>
        </div>

        <div className="rounded-xl border border-andrequice-sand bg-andrequice-sand/30 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-andrequice-border">
            Política de reembolso
          </p>
          <p className="text-xs text-andrequice-brown leading-relaxed">
            Como este é um item artesanal feito sob demanda, o reembolso em caso de
            cancelamento é parcial.
          </p>
          <div className="flex justify-between text-sm pt-1">
            <span className="text-andrequice-brown">Valor pago</span>
            <span className="tabular-nums font-medium">{formatPrice(item.subtotal_cents / 100)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-andrequice-navy font-semibold">Reembolso ({percentage}%)</span>
            <span className="tabular-nums font-semibold text-andrequice-navy">
              {formatPrice(refundCents / 100)}
            </span>
          </div>
          <p className="text-[11px] text-andrequice-border pt-2">
            O valor será devolvido ao mesmo método de pagamento em até 10 dias úteis.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="cancel-reason" className="text-xs font-semibold text-andrequice-navy">
            Motivo (opcional)
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-andrequice-sand bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-andrequice-gold"
            placeholder="Conte-nos por que está cancelando"
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end pt-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Voltar
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Processando...' : 'Cancelar item e receber reembolso'}
          </Button>
        </div>
      </div>
    </div>
  )
}

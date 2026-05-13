import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Button } from '@/components/Button'
import { trackingService, type TrackingOrder } from '@/services/trackingService'
import { formatPrice } from '@/lib/utils'

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateString))
}

const STATUS_STEPS = [
  { key: 'pending',          label: 'Pedido realizado' },
  { key: 'paid',             label: 'Pagamento aprovado' },
  { key: 'processing',       label: 'Em processamento' },
  { key: 'producing',        label: 'Em produção' },
  { key: 'packed',           label: 'Embalado' },
  { key: 'shipped',          label: 'Enviado' },
  { key: 'out_for_delivery', label: 'Saiu para entrega' },
  { key: 'delivered',        label: 'Entregue' },
]

const TERMINAL_STATUSES = ['cancelled', 'refunded', 'failed', 'disputed']

function statusIndex(status: string): number {
  return STATUS_STEPS.findIndex((s) => s.key === status)
}

function TimelineStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div
          className={[
            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
            done || active
              ? 'bg-andrequice-gold text-andrequice-navy'
              : 'bg-andrequice-sand text-andrequice-border',
          ].join(' ')}
        >
          {done || active ? '✓' : '○'}
        </div>
      </div>
      <p
        className={[
          'text-sm pt-0.5',
          active
            ? 'text-andrequice-navy font-semibold'
            : done
            ? 'text-andrequice-brown'
            : 'text-andrequice-border',
        ].join(' ')}
      >
        {label}
      </p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-andrequice-sand rounded w-40" />
      <div className="h-4 bg-andrequice-sand rounded w-56" />
      <div className="space-y-2 mt-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-andrequice-sand rounded" />
        ))}
      </div>
    </div>
  )
}

export default function TrackOrder() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<TrackingOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    trackingService
      .get(token)
      .then(setOrder)
      .catch((err) => {
        setError(
          err?.response?.status === 404
            ? 'Pedido não encontrado. Verifique o link de acompanhamento.'
            : 'Não foi possível carregar o pedido. Tente novamente em alguns instantes.'
        )
      })
      .finally(() => setLoading(false))
  }, [token])

  const currentIndex = order ? statusIndex(order.status) : -1
  const isTerminal = order ? TERMINAL_STATUSES.includes(order.status) : false

  return (
    <div className="min-h-screen bg-andrequice-cream flex flex-col">
      <Header />

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {loading && (
          <div className="space-y-6">
            <SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-full bg-andrequice-sand/60 flex items-center justify-center mx-auto">
              <span className="text-2xl">📦</span>
            </div>
            <p className="text-andrequice-navy font-serif text-lg">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar ao início
            </Button>
          </div>
        )}

        {!loading && order && (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <p className="text-xs text-andrequice-border uppercase tracking-widest mb-1">
                Acompanhamento
              </p>
              <h1 className="font-serif text-2xl text-andrequice-navy">
                Pedido {order.number}
              </h1>
              <p className="text-sm text-andrequice-border mt-1">
                {formatDate(order.created_at)}
              </p>
            </div>

            {/* Status badge */}
            <div
              className={[
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
                isTerminal
                  ? order.status === 'delivered'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                  : 'bg-andrequice-gold/10 text-andrequice-navy',
              ].join(' ')}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              {order.status_label}
            </div>

            {/* Terminal status message */}
            {isTerminal && order.status !== 'delivered' && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">
                  {order.status === 'cancelled' && 'Este pedido foi cancelado.'}
                  {order.status === 'refunded' && 'O reembolso foi processado.'}
                  {order.status === 'failed' && 'O pagamento não foi aprovado.'}
                  {order.status === 'disputed' && 'Este pedido está em análise.'}
                </p>
              </div>
            )}

            {/* Timeline */}
            {!isTerminal && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-andrequice-sand space-y-3">
                <h2 className="text-xs font-semibold text-andrequice-border uppercase tracking-wider mb-4">
                  Status do pedido
                </h2>
                {STATUS_STEPS.map((step, i) => (
                  <TimelineStep
                    key={step.key}
                    label={step.label}
                    done={i < currentIndex}
                    active={i === currentIndex}
                  />
                ))}
              </div>
            )}

            {/* History Timeline */}
            {order.timeline.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-andrequice-sand">
                <h2 className="text-xs font-semibold text-andrequice-border uppercase tracking-wider mb-4">
                  Histórico de atualizações
                </h2>
                <div className="space-y-3">
                  {[...order.timeline].reverse().map((entry, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center pt-0.5">
                        <div
                          className={[
                            'w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0',
                            i === 0
                              ? 'bg-andrequice-gold text-andrequice-navy font-bold'
                              : 'bg-andrequice-sand text-andrequice-border',
                          ].join(' ')}
                        >
                          ✓
                        </div>
                        {i < order.timeline.length - 1 && (
                          <div className="w-px flex-1 bg-andrequice-sand mt-1" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p
                          className={[
                            'text-sm',
                            i === 0
                              ? 'text-andrequice-navy font-semibold'
                              : 'text-andrequice-brown',
                          ].join(' ')}
                        >
                          {entry.title}
                        </p>
                        {entry.description && (
                          <p className="text-xs text-andrequice-border mt-0.5">
                            {entry.description}
                          </p>
                        )}
                        <p className="text-xs text-andrequice-border mt-0.5">
                          {new Date(entry.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tracking / Carrier */}
            {order.tracking_code && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-andrequice-sand">
                <h2 className="text-xs font-semibold text-andrequice-border uppercase tracking-wider mb-3">
                  Rastreio
                </h2>
                <p className="font-mono text-base text-andrequice-navy font-semibold tracking-wide">
                  {order.tracking_code}
                </p>
                {order.carrier && (
                  <p className="text-sm text-andrequice-border mt-1">
                    {order.carrier}
                    {order.shipping_service && ` — ${order.shipping_service}`}
                  </p>
                )}
                {order.estimated_delivery && (
                  <p className="text-xs text-andrequice-border mt-2">
                    Previsão de entrega:{' '}
                    <span className="text-andrequice-navy font-medium">
                      {formatDate(order.estimated_delivery)}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Order Summary */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-andrequice-sand">
              <h2 className="text-xs font-semibold text-andrequice-border uppercase tracking-wider mb-4">
                Itens do pedido
              </h2>
              <div className="divide-y divide-andrequice-sand">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-andrequice-navy font-medium">{item.name}</p>
                      <p className="text-xs text-andrequice-border mt-0.5">
                        Tam. {item.size} · Qtd {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm text-andrequice-navy font-semibold">
                      {formatPrice(item.subtotal_cents / 100)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-andrequice-sand pt-3 mt-1 space-y-1.5">
                <div className="flex justify-between text-sm text-andrequice-border">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.items_total_cents / 100)}</span>
                </div>
                {order.shipping_fee_cents > 0 && (
                  <div className="flex justify-between text-sm text-andrequice-border">
                    <span>Frete</span>
                    <span>{formatPrice(order.shipping_fee_cents / 100)}</span>
                  </div>
                )}
                {order.shipping_fee_cents === 0 && order.delivery_method === 'delivery' && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Frete</span>
                    <span>Grátis</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-andrequice-navy pt-1 border-t border-andrequice-sand">
                  <span>Total</span>
                  <span>{formatPrice(order.total_cents / 100)}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                Continuar comprando
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

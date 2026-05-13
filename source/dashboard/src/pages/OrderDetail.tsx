import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Loader2, Copy, Check, Mail, ExternalLink,
  Truck, Package, Clock
} from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { StatusBadge } from '@/components/StatusBadge'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import { useOrder, useUpdateOrder, useResendOrderEmail } from '@/hooks/useOrders'
import { useToast } from '@/hooks/useToast'
import type { OrderStatus } from '@/types/order'

const STATUS_OPTIONS: { label: string; value: OrderStatus }[] = [
  { label: 'Pendente',          value: 'pending' },
  { label: 'Pago',              value: 'paid' },
  { label: 'Em processamento',  value: 'processing' },
  { label: 'Em produção',       value: 'producing' },
  { label: 'Embalado',          value: 'packed' },
  { label: 'Enviado',           value: 'shipped' },
  { label: 'Saiu para entrega', value: 'out_for_delivery' },
  { label: 'Entregue',          value: 'delivered' },
  { label: 'Cancelado',         value: 'cancelled' },
  { label: 'Reembolsado',       value: 'refunded' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const { data: order, isLoading } = useOrder(id ? parseInt(id) : 0)
  const updateMutation = useUpdateOrder()
  const resendMutation = useResendOrderEmail()

  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [trackingCode, setTrackingCode] = useState('')
  const [carrier, setCarrier] = useState('')
  const [shippingService, setShippingService] = useState('')
  const [estimatedDelivery, setEstimatedDelivery] = useState('')

  // Populate local state once order is loaded (only on first load)
  const [initialized, setInitialized] = useState(false)
  if (order && !initialized) {
    setTrackingCode(order.tracking_code ?? '')
    setCarrier(order.carrier ?? '')
    setShippingService(order.shipping_service ?? '')
    setEstimatedDelivery(order.estimated_delivery ?? '')
    setInitialized(true)
  }

  const currentStatus = status || order?.status || ''

  const handleStatusSave = async () => {
    if (!order || !status || status === order.status) return
    try {
      await updateMutation.mutateAsync({ id: order.id, data: { status } })
      toast.success('Status atualizado')
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  const handleTrackingSave = async () => {
    if (!order) return
    try {
      await updateMutation.mutateAsync({
        id: order.id,
        data: {
          tracking_code:    trackingCode || undefined,
          carrier:          carrier || undefined,
          shipping_service: shippingService || undefined,
          estimated_delivery: estimatedDelivery || undefined,
        },
      })
      toast.success('Informações de entrega salvas')
    } catch {
      toast.error('Erro ao salvar informações de entrega')
    }
  }

  const handleResendEmail = async () => {
    if (!order) return
    try {
      await resendMutation.mutateAsync(order.id)
      toast.success('Email de notificação reenviado')
    } catch {
      toast.error('Erro ao reenviar email')
    }
  }

  if (isLoading) return <LoadingState />
  if (!order) return <p className="p-6 text-muted-foreground">Pedido não encontrado.</p>

  const trackingUrl = order.tracking_url

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6">
      <PageTitle
        title={`Pedido ${order.number ?? `#${order.id}`}`}
        subtitle={formatDateTime(order.created_at)}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-4 lg:col-span-2">

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-muted-foreground" />
                Itens do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {order.items.length === 0 ? (
                <p className="px-5 py-4 text-sm text-muted-foreground">Nenhum item disponível.</p>
              ) : (
                <div className="divide-y divide-border">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tamanho {item.size} · Qtd {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.subtotal_cents)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Separator />
              <div className="space-y-1.5 px-5 py-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(order.items_total_cents)}</span>
                </div>
                {order.shipping_fee_cents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Frete</span>
                    <span>{formatCurrency(order.shipping_fee_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total_cents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <p className="font-medium">{order.customer_name}</p>
              <p className="text-muted-foreground">{order.customer_email}</p>
              {order.customer_phone && (
                <p className="text-muted-foreground">{order.customer_phone}</p>
              )}
            </CardContent>
          </Card>

          {/* Delivery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-muted-foreground" />
                Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">
                {order.delivery_method === 'delivery' ? 'Entrega em domicílio' : 'Retirada'}
              </p>
              {order.shipping_address && (
                <>
                  <p>
                    {order.shipping_address.address}, {order.shipping_address.number}
                    {order.shipping_address.complement ? ` — ${order.shipping_address.complement}` : ''}
                  </p>
                  <p>
                    {order.shipping_address.city} — {order.shipping_address.state}
                  </p>
                  <p>CEP {order.shipping_address.cep}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tracking info (editable) */}
          {order.delivery_method === 'delivery' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rastreio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="tracking-code">Código de rastreio</Label>
                    <Input
                      id="tracking-code"
                      value={trackingCode}
                      onChange={(e) => setTrackingCode(e.target.value)}
                      placeholder="BR123456789BR"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="estimated-delivery">Previsão de entrega</Label>
                    <Input
                      id="estimated-delivery"
                      type="date"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="carrier">Transportadora</Label>
                    <Input
                      id="carrier"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      placeholder="Correios, JADLOG..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shipping-service">Serviço</Label>
                    <Input
                      id="shipping-service"
                      value={shippingService}
                      onChange={(e) => setShippingService(e.target.value)}
                      placeholder="PAC, SEDEX..."
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateMutation.isPending}
                  onClick={handleTrackingSave}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Salvar rastreio'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Status History Timeline */}
          {order.status_histories && order.status_histories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Histórico de Status
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {[...order.status_histories].reverse().map((entry, i) => (
                    <div key={entry.id} className="flex gap-3 px-5 py-3">
                      <div className="flex flex-col items-center pt-0.5">
                        <div
                          className={[
                            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0',
                            i === 0
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground',
                          ].join(' ')}
                        >
                          ✓
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={['text-sm', i === 0 ? 'font-semibold' : 'text-muted-foreground'].join(' ')}>
                            {entry.title}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatDateTime(entry.created_at)}
                          </span>
                        </div>
                        {entry.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                        )}
                        {entry.created_by && entry.created_by !== 'system' && entry.created_by !== 'stripe' && (
                          <p className="text-xs text-muted-foreground mt-0.5">por {entry.created_by}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Atual:</span>
                <StatusBadge status={order.status} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Alterar status</p>
                <Select
                  value={currentStatus}
                  onValueChange={(v) => setStatus(v as OrderStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={!status || status === order.status || updateMutation.isPending}
                  onClick={handleStatusSave}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Salvar status'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tracking link */}
          {trackingUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Link Público</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="flex-1 font-mono text-[10px] text-muted-foreground truncate">
                    {trackingUrl}
                  </span>
                  <CopyButton text={trackingUrl} />
                </div>
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Abrir página pública
                </a>
                <div className="pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={resendMutation.isPending}
                    onClick={handleResendEmail}
                  >
                    {resendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-1.5" />
                        Reenviar email
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tracking token (dev reference) */}
          {order.tracking_token && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Token de Rastreio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 rounded-md border bg-muted/40 px-3 py-2">
                  <span className="flex-1 font-mono text-[10px] text-muted-foreground truncate">
                    {order.tracking_token}
                  </span>
                  <CopyButton text={order.tracking_token} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Token seguro único. Nunca expor em locais públicos além da URL de rastreio.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Estimated delivery badge */}
          {order.estimated_delivery && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Previsão de entrega</p>
                    <p className="text-sm font-medium">{formatDate(order.estimated_delivery)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  )
}

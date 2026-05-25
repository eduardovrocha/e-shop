import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Factory, RefreshCw, Search, Loader2, Clock, Hammer, TrendingUp, XCircle, Info, ArrowDownAZ } from 'lucide-react'
import { PageTitle } from '@/components/PageTitle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MetricCard } from '@/components/MetricCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingState } from '@/components/LoadingState'
import { EmptyState } from '@/components/EmptyState'
import { useToast } from '@/hooks/useToast'
import { formatVariantDescriptors } from '@/utils/variant'
import { useProducts } from '@/hooks/useProducts'
import {
  useOrderItems,
  useStartProduction,
  useCompleteProduction,
} from '@/hooks/useOrderItems'
import { useProductionMetrics } from '@/hooks/useProductionMetrics'
import type { AdminOrderItem } from '@/services/orderItemsService'
import { formatDate, formatDateTime } from '@/lib/utils'

const REFRESH_INTERVAL_MS = 30_000

// Visual sort options for the queue column. Order here matches the dropdown.
// IMPORTANT: this is purely visual. AdvanceQueueJob still promotes by
// created_at ASC regardless of which option is selected.
const QUEUE_SORT_OPTIONS = [
  { value: 'created_at_asc',               label: 'Mais antigos primeiro (FIFO)' },
  { value: 'created_at_desc',              label: 'Mais recentes primeiro' },
  { value: 'promised_completion_date_asc', label: 'Urgência (prazo mais próximo)' },
  { value: 'customer_name_asc',            label: 'Cliente (A → Z)' },
  { value: 'product_name_asc',             label: 'Produto (A → Z)' },
] as const
type QueueSortValue = typeof QUEUE_SORT_OPTIONS[number]['value']
const DEFAULT_QUEUE_SORT: QueueSortValue = 'created_at_asc'
const QUEUE_SORT_STORAGE_KEY = 'admin.production.queue_sort'

function isValidQueueSort(v: string | null): v is QueueSortValue {
  return !!v && QUEUE_SORT_OPTIONS.some((o) => o.value === v)
}

function readPersistedQueueSort(): QueueSortValue {
  try {
    const v = localStorage.getItem(QUEUE_SORT_STORAGE_KEY)
    return isValidQueueSort(v) ? v : DEFAULT_QUEUE_SORT
  } catch {
    return DEFAULT_QUEUE_SORT
  }
}

function daysAgo(iso: string | null | undefined): number {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function isOverdue(dateStr: string | null | undefined): 'overdue' | 'soon' | 'ok' {
  if (!dateStr) return 'ok'
  const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'overdue'
  if (days <= 2) return 'soon'
  return 'ok'
}

function PromisedDate({ date }: { date: string | null | undefined }) {
  if (!date) return null
  const state = isOverdue(date)
  const color =
    state === 'overdue' ? 'text-destructive' :
    state === 'soon'    ? 'text-amber-600'   :
                          'text-muted-foreground'
  return (
    <p className={`text-xs ${color}`}>
      Prazo: {formatDate(date)}
    </p>
  )
}

function ItemCard({
  item,
  column,
  onAction,
  pending,
}: {
  item: AdminOrderItem
  column: 'queue' | 'producing' | 'done'
  onAction?: () => void
  pending?: boolean
}) {
  const navigate = useNavigate()
  const timeLabel =
    column === 'queue'     ? `Na fila há ${daysAgo(item.created_at)} dia(s)` :
    column === 'producing' ? `Iniciada há ${daysAgo(item.production_started_at)} dia(s)` :
                             `Pronta há ${daysAgo(item.production_completed_at)} dia(s)`

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <button
            className="text-sm font-medium hover:underline"
            onClick={() => navigate(`/orders/${item.order_id}`)}
          >
            #{item.order_number ?? item.order_id}
          </button>
          <span className="text-xs text-muted-foreground">{item.quantity}× </span>
        </div>
        <p className="text-xs text-muted-foreground">{item.customer_name}</p>
        <p className="text-sm">
          {item.product_name}
          {(() => {
            const descriptors = formatVariantDescriptors({
              gender: item.gender,
              cut:    item.cut,
              size:   item.size,
            })
            return descriptors ? <span className="text-muted-foreground"> · {descriptors}</span> : null
          })()}
        </p>
        {column === 'queue' && (
          <p className="text-xs text-muted-foreground">
            Pedido em {formatDateTime(item.created_at)}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{timeLabel}</p>
        <PromisedDate date={item.promised_completion_date} />

        {column === 'queue' && (
          <Button
            size="sm"
            className="w-full"
            disabled={pending}
            onClick={onAction}
            aria-label={`Iniciar produção do item ${item.id}`}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Iniciar produção'}
          </Button>
        )}
        {column === 'producing' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={pending}
            onClick={onAction}
            aria-label={`Marcar item ${item.id} como pronto`}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Marcar como pronto'}
          </Button>
        )}
        {column === 'done' && (
          <button
            className="text-xs text-primary hover:underline"
            onClick={() => navigate(`/orders/${item.order_id}`)}
          >
            Ver pedido →
          </button>
        )}
      </CardContent>
    </Card>
  )
}

export default function Production() {
  const toast = useToast()
  const { data: productsResp } = useProducts({ per_page: 100 })
  const products = useMemo(
    () => (productsResp?.products ?? []).filter((p) => p.fulfillment_mode === 'made_to_order' && p.active),
    [productsResp]
  )

  const [productId, setProductId] = useState<string>('all')
  const [period, setPeriod] = useState<7 | 30 | 90>(30)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tabVisible, setTabVisible] = useState(() => !document.hidden)
  const [queueSort, setQueueSort] = useState<QueueSortValue>(() => readPersistedQueueSort())

  // Persist sort changes so the preference survives reload / navigation.
  // Repeated selection of the same value is a no-op for both setState and
  // localStorage (React bails out on identical state).
  useEffect(() => {
    try { localStorage.setItem(QUEUE_SORT_STORAGE_KEY, queueSort) } catch { /* ignore */ }
  }, [queueSort])

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(id)
  }, [search])

  useEffect(() => {
    const onVis = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const refetchInterval: number | false = tabVisible ? REFRESH_INTERVAL_MS : false

  const baseParams = useMemo(
    () => ({
      ...(productId !== 'all' && { product_id: Number(productId) }),
      ...(debouncedSearch.trim() && { q: debouncedSearch.trim() }),
    }),
    [productId, debouncedSearch]
  )

  const queueQuery = useOrderItems(
    { ...baseParams, production_status: 'paid', fulfillment_mode: 'made_to_order', sort: queueSort },
    { refetchInterval }
  )
  const producingQuery = useOrderItems(
    { ...baseParams, production_status: 'in_production', sort: 'production_started_at_asc' },
    { refetchInterval }
  )
  const doneQuery = useOrderItems(
    { ...baseParams, production_status: 'ready_to_ship', had_production: true, sort: 'production_completed_at_desc' },
    { refetchInterval }
  )

  const metricsQuery = useProductionMetrics({
    period_days: period,
    ...(productId !== 'all' && { product_id: Number(productId) }),
  })

  const startMutation = useStartProduction()
  const completeMutation = useCompleteProduction()
  const [pendingStart, setPendingStart] = useState<AdminOrderItem | null>(null)

  function handleStartRequest(item: AdminOrderItem) {
    const capacity = item.production_capacity ?? 0
    const inProduction = producingQuery.data?.order_items
      .filter((i) => i.product_id === item.product_id).length ?? 0
    if (capacity > 0 && inProduction >= capacity) {
      setPendingStart(item)
    } else {
      startProductionFor(item.id)
    }
  }

  async function startProductionFor(id: number) {
    try {
      await startMutation.mutateAsync(id)
      toast.success('Produção iniciada')
    } catch {
      toast.error('Não foi possível iniciar a produção')
    }
  }

  async function handleComplete(id: number) {
    try {
      await completeMutation.mutateAsync(id)
      toast.success('Item marcado como pronto')
    } catch {
      toast.error('Não foi possível concluir a produção')
    }
  }

  function refreshAll() {
    queueQuery.refetch()
    producingQuery.refetch()
    doneQuery.refetch()
  }

  const overrideMessage = pendingStart && (() => {
    const cap = pendingStart.production_capacity ?? 0
    const cur = producingQuery.data?.order_items
      .filter((i) => i.product_id === pendingStart.product_id).length ?? 0
    return `A capacidade de produção deste produto está cheia (${cur}/${cap}). Iniciar este item criará um slot virtual. Confirma?`
  })()

  if (queueQuery.isLoading && producingQuery.isLoading && doneQuery.isLoading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="Produção"
        subtitle="Fila de pedidos sob encomenda"
        actions={
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {/* Métricas */}
      <MetricsSection
        period={period}
        onPeriodChange={setPeriod}
        data={metricsQuery.data}
        loading={metricsQuery.isLoading}
      />

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Produto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os produtos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os produtos</SelectItem>
                {products.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="q">Busca por pedido ou cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="q"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="#pedido ou nome"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo das colunas — sempre visível, independente de viewport.
          Crítico em telas < lg onde as 3 colunas empilham verticalmente
          e a primeira (Fila) frequentemente está vazia, escondendo o
          fato de que há itens nas colunas seguintes. */}
      <QueueSummary
        queue={{
          count:   queueQuery.data?.order_items.length ?? 0,
          loading: queueQuery.isFetching,
          anchor:  'col-queue',
          label:   'Fila',
        }}
        producing={{
          count:   producingQuery.data?.order_items.length ?? 0,
          loading: producingQuery.isFetching,
          anchor:  'col-producing',
          label:   'Em produção',
        }}
        done={{
          count:   doneQuery.data?.order_items.length ?? 0,
          loading: doneQuery.isFetching,
          anchor:  'col-done',
          label:   'Pronto para envio',
        }}
      />

      {/* Colunas */}
      <div className="grid gap-4 lg:grid-cols-3" data-tour="production-list">
        <div id="col-queue" className="scroll-mt-4">
        <Column
          title="Fila"
          ariaLabel="Itens na fila aguardando início de produção"
          icon={<Factory className="h-4 w-4 text-muted-foreground" />}
          count={queueQuery.data?.order_items.length ?? 0}
          items={queueQuery.data?.order_items ?? []}
          loading={queueQuery.isFetching}
          empty="Nenhum item na fila."
          headerExtra={
            <Select
              value={queueSort}
              onValueChange={(v) => {
                if (isValidQueueSort(v)) setQueueSort(v)
              }}
            >
              <SelectTrigger
                id="queue-sort"
                aria-label={`Ordenar fila — atual: ${
                  QUEUE_SORT_OPTIONS.find((o) => o.value === queueSort)?.label ?? ''
                }`}
                title="Ordenar fila"
                className="h-8 w-auto gap-1.5 px-2 text-xs font-normal shrink-0"
              >
                <ArrowDownAZ className="h-4 w-4" aria-hidden="true" />
                <span>Ordenar</span>
              </SelectTrigger>
              <SelectContent align="end">
                {QUEUE_SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
          belowHeader={
            queueSort !== DEFAULT_QUEUE_SORT ? (
              <Badge variant="warning" className="flex items-start gap-1.5 w-full whitespace-normal text-[11px] font-normal leading-snug py-1.5">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                  Ordem visual alterada — a produção continua sendo promovida automaticamente por FIFO.
                </span>
              </Badge>
            ) : null
          }
          renderItem={(item) => (
            <ItemCard
              key={item.id}
              item={item}
              column="queue"
              pending={startMutation.isPending && startMutation.variables === item.id}
              onAction={() => handleStartRequest(item)}
            />
          )}
        />
        </div>
        <div id="col-producing" className="scroll-mt-4">
        <Column
          title="Em produção"
          ariaLabel="Itens atualmente em produção"
          icon={<Factory className="h-4 w-4 text-muted-foreground" />}
          count={producingQuery.data?.order_items.length ?? 0}
          items={producingQuery.data?.order_items ?? []}
          loading={producingQuery.isFetching}
          empty="Nenhum item em produção."
          renderItem={(item) => (
            <ItemCard
              key={item.id}
              item={item}
              column="producing"
              pending={completeMutation.isPending && completeMutation.variables === item.id}
              onAction={() => handleComplete(item.id)}
            />
          )}
        />
        </div>
        <div id="col-done" className="scroll-mt-4">
        <Column
          title="Prontos"
          ariaLabel="Itens prontos para envio"
          icon={<Factory className="h-4 w-4 text-muted-foreground" />}
          count={doneQuery.data?.order_items.length ?? 0}
          items={doneQuery.data?.order_items ?? []}
          loading={doneQuery.isFetching}
          empty="Nenhum item pronto."
          renderItem={(item) => <ItemCard key={item.id} item={item} column="done" />}
        />
        </div>
      </div>

      <ConfirmDialog
        open={pendingStart !== null}
        onOpenChange={(v) => !v && setPendingStart(null)}
        title="Capacidade saturada"
        description={overrideMessage ?? ''}
        confirmLabel="Iniciar mesmo assim"
        onConfirm={() => {
          if (pendingStart) startProductionFor(pendingStart.id)
          setPendingStart(null)
        }}
      />
    </div>
  )
}

function formatHoursOrDays(hours: number): string {
  if (hours < 48) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)} d`
}

function MetricsSection({
  period,
  onPeriodChange,
  data,
  loading,
}: {
  period: 7 | 30 | 90
  onPeriodChange: (p: 7 | 30 | 90) => void
  data: import('@/services/productionMetricsService').ProductionMetrics | undefined
  loading: boolean
}) {
  return (
    <section aria-label="Métricas de produção" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Período:</span>
        {([7, 30, 90] as const).map((p) => (
          <Button
            key={p}
            size="sm"
            variant={period === p ? 'default' : 'outline'}
            onClick={() => onPeriodChange(p)}
          >
            {p}d
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Tempo em fila"
          loading={loading}
          icon={Clock}
          accent="navy"
          value={data && data.samples.queue_time > 0
            ? formatHoursOrDays(data.avg_queue_time_hours)
            : 'Sem dados'}
          subtitle={data ? `média · ${data.samples.queue_time} ${data.samples.queue_time === 1 ? 'item' : 'itens'}` : ''}
        />
        <MetricCard
          title="Tempo em produção"
          loading={loading}
          icon={Hammer}
          accent="gold"
          value={data && data.samples.production_time > 0
            ? `${(data.avg_production_time_hours / 24).toFixed(1)} d`
            : 'Sem dados'}
          subtitle={data ? `média · ${data.samples.production_time} ${data.samples.production_time === 1 ? 'item' : 'itens'}` : ''}
        />
        <MetricCard
          title="Throughput semanal"
          loading={loading}
          icon={TrendingUp}
          accent="green"
          value={data && data.samples.throughput > 0
            ? `${data.throughput_per_week.toFixed(1)}`
            : 'Sem dados'}
          subtitle={data ? `itens / semana · ${data.samples.throughput} ${data.samples.throughput === 1 ? 'item' : 'itens'}` : ''}
        />
        <MetricCard
          title="Taxa de cancelamento"
          loading={loading}
          icon={XCircle}
          accent="amber"
          value={data && data.samples.cancellation > 0
            ? `${(data.cancellation_rate * 100).toFixed(0)}%`
            : 'Sem dados'}
          subtitle={data ? `total · ${data.samples.cancellation} ${data.samples.cancellation === 1 ? 'item' : 'itens'}` : ''}
        />
      </div>
    </section>
  )
}

function Column({
  title,
  ariaLabel,
  icon,
  count,
  items,
  loading,
  empty,
  renderItem,
  headerExtra,
  belowHeader,
}: {
  title: string
  ariaLabel: string
  icon: React.ReactNode
  count: number
  items: AdminOrderItem[]
  loading: boolean
  empty: string
  renderItem: (item: AdminOrderItem) => React.ReactNode
  headerExtra?: React.ReactNode
  belowHeader?: React.ReactNode
}) {
  return (
    <section aria-label={ariaLabel} className="space-y-3">
      <Card>
        <CardHeader className="pb-3 space-y-2">
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            <span className="flex items-center gap-2">
              {icon}
              {title}
              <span className="text-xs font-normal text-muted-foreground">
                ({loading ? <Loader2 className="h-3 w-3 inline animate-spin" /> : count})
              </span>
            </span>
            {headerExtra}
          </CardTitle>
          {belowHeader}
        </CardHeader>
      </Card>
      {items.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <div className="space-y-3">{items.map(renderItem)}</div>
      )}
    </section>
  )
}

// Compact summary strip that exposes every column's count above the fold
// regardless of viewport. On <lg screens the 3 columns stack vertically
// and the empty "Fila" column at the top used to hide the fact that the
// next column had 17 items — operators reasonably concluded "there are
// no items in production". Now each pill is clickable: it scrolls the
// target column into view, replacing the implicit "rolar pra baixo"
// instruction with an explicit affordance.
interface QueueSummaryEntry {
  count:   number
  loading: boolean
  anchor:  string
  label:   string
}

function QueueSummary({
  queue, producing, done,
}: { queue: QueueSummaryEntry; producing: QueueSummaryEntry; done: QueueSummaryEntry }) {
  const entries = [ queue, producing, done ]
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {entries.map((e) => (
        <a
          key={e.anchor}
          href={`#${e.anchor}`}
          aria-label={`Ver coluna ${e.label} (${e.count} ${e.count === 1 ? 'item' : 'itens'})`}
          className={[
            'rounded-lg border px-3 py-2 sm:px-4 sm:py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            e.count > 0 ? 'border-primary/30 bg-primary/[0.04]' : 'border-border',
          ].join(' ')}
        >
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            {e.label}
          </div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <span className={[
              'text-2xl font-semibold tabular-nums',
              e.count > 0 ? 'text-foreground' : 'text-muted-foreground/60',
            ].join(' ')}>
              {e.loading ? <Loader2 className="h-5 w-5 inline animate-spin" /> : e.count}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {e.count === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </a>
      ))}
    </div>
  )
}

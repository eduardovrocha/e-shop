import type { CartItem } from '@/store/cartStore'
import { Badge } from '@/components/Badge'
import { PriceTag } from '@/components/PriceTag'
import { formatPrice } from '@/lib/utils'
import { formatInstallmentLabel, type InstallmentCount } from '@/utils/installments'

// Reused by /cart and /checkout. Pure presentation — receives derived
// totals from the parent (which already owns the cart store and shipping
// selection). No duplicated math here; subtotal/shippingFee come pre-
// computed so both pages stay in lockstep.

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  shippingFee: number | null
  shippingFreeLabel?: string
  promisedCompletionDate?: string | null
  promisedLabel?: string
  cta?: React.ReactNode
  footer?: React.ReactNode
  collapsibleOnMobile?: boolean
  // When set, renders an installment line beneath Total. Omit on pages
  // that don't drive a payment yet (e.g. /cart) — the line is invisible
  // until the buyer picks a count in /checkout.
  installmentCount?: InstallmentCount
  // Coupon snapshot. discount is in BRL (matches `subtotal` units, not
  // cents). code drives the label; eligibleProductIds drives the per-item
  // badge. Pass null/undefined when no coupon is applied.
  discount?: number | null
  couponCode?: string | null
  eligibleProductIds?: number[]
  // Optional slot rendered between item list and totals (e.g. CouponInput).
  beforeTotals?: React.ReactNode
}

function ItemRow({ item, discountBadge }: { item: CartItem; discountBadge?: string | null }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-andrequice-sand">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-andrequice-border">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1.5">
          <p className="font-serif font-semibold text-andrequice-navy text-sm leading-snug line-clamp-2 flex-1">
            {item.name}
          </p>
          {discountBadge && (
            <span
              className="flex-shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
              aria-label={`Desconto de ${discountBadge}`}
            >
              {discountBadge}
            </span>
          )}
        </div>
        <p className="text-xs text-andrequice-border mt-0.5">
          {item.size && <>Tam. {item.size} · </>}Qtd. {item.quantity}
        </p>
        <div className="mt-1.5">
          <Badge
            variant={item.fulfillmentMode === 'made_to_order' ? 'copper' : 'sand'}
            className="text-[10px]"
          >
            {item.fulfillmentMode === 'made_to_order' ? 'Sob encomenda' : 'Pronta entrega'}
          </Badge>
        </div>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-semibold text-andrequice-navy whitespace-nowrap">
          {formatPrice(item.price * item.quantity)}
        </p>
        {item.quantity > 1 && (
          <p className="text-[11px] text-andrequice-border tabular-nums mt-0.5">
            {item.quantity}× {formatPrice(item.price)}
          </p>
        )}
      </div>
    </li>
  )
}

function SealsRow() {
  return (
    <div className="grid grid-cols-3 gap-2 pt-1">
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden="true" className="text-lg">🛡</span>
        <span className="text-[10px] font-medium text-andrequice-border leading-tight">Compra segura</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden="true" className="text-lg">🚚</span>
        <span className="text-[10px] font-medium text-andrequice-border leading-tight">Entrega rápida</span>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <span aria-hidden="true" className="text-lg">↩</span>
        <span className="text-[10px] font-medium text-andrequice-border leading-tight">Trocas fáceis</span>
      </div>
    </div>
  )
}

function SummaryBody({
  items, subtotal, shippingFee, shippingFreeLabel,
  promisedCompletionDate, promisedLabel, cta, footer,
  installmentCount, discount, couponCode, eligibleProductIds, beforeTotals,
}: Omit<OrderSummaryProps, 'collapsibleOnMobile'>) {
  const discountValue = discount ?? 0
  const total = subtotal - discountValue + (shippingFee ?? 0)
  const totalCents = Math.round(total * 100)
  const eligibleSet = new Set(eligibleProductIds ?? [])
  const badgeLabel  = couponCode && discountValue > 0
    ? `-${Math.round((discountValue / Math.max(subtotal, 0.01)) * 100)}%`
    : null

  return (
    <div className="flex flex-col">
      <ul className="divide-y divide-andrequice-sand">
        {items.map((item) => (
          <ItemRow
            key={item.variantId}
            item={item}
            discountBadge={eligibleSet.has(item.id) ? badgeLabel : null}
          />
        ))}
      </ul>

      <div className="h-px bg-andrequice-sand mt-2" />

      {beforeTotals && <div className="mt-3">{beforeTotals}</div>}

      <dl className="flex flex-col gap-2 pt-3 text-sm">
        <div className="flex justify-between text-andrequice-brown">
          <dt>Subtotal</dt>
          <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        {couponCode && discountValue > 0 && (
          <div className="flex justify-between text-emerald-700">
            <dt>Desconto ({couponCode})</dt>
            <dd className="tabular-nums">−{formatPrice(discountValue)}</dd>
          </div>
        )}
        <div className="flex justify-between text-andrequice-brown">
          <dt>Frete</dt>
          <dd className="tabular-nums">
            {shippingFee === null
              ? '—'
              : shippingFee === 0
                ? (shippingFreeLabel ?? 'Grátis')
                : formatPrice(shippingFee)}
          </dd>
        </div>
      </dl>

      <div className="h-px bg-andrequice-sand mt-3" />

      <div className="flex items-center justify-between pt-3">
        <span className="font-sans font-semibold text-andrequice-navy">Total</span>
        <PriceTag value={total} size="lg" />
      </div>

      {installmentCount && (
        <p className="mt-1 text-right text-xs text-andrequice-brown tabular-nums">
          {formatInstallmentLabel(totalCents, installmentCount)}
        </p>
      )}

      {promisedCompletionDate && (
        <div className="mt-3 rounded-xl bg-andrequice-sand/40 border border-andrequice-sand px-3 py-2.5">
          <p className="text-xs font-semibold text-andrequice-navy">
            {promisedLabel ?? 'Prazo de envio'}
          </p>
          <p className="text-xs text-andrequice-brown/80 mt-0.5">{promisedCompletionDate}</p>
        </div>
      )}

      {cta && <div className="mt-4">{cta}</div>}

      <div className="mt-4 pt-4 border-t border-andrequice-sand">
        <SealsRow />
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}

export function OrderSummary(props: OrderSummaryProps) {
  const { collapsibleOnMobile = true, items } = props
  const itemCount = items.reduce((n, i) => n + i.quantity, 0)
  const totalFmt = `${formatPrice(props.subtotal - (props.discount ?? 0) + (props.shippingFee ?? 0))}`

  if (!collapsibleOnMobile) {
    return (
      <section
        aria-label="Resumo do pedido"
        className="bg-white rounded-2xl shadow-soft p-4 sm:p-5"
      >
        <h2 className="font-sans text-sm font-semibold text-andrequice-navy mb-3">
          Resumo do pedido
        </h2>
        <SummaryBody {...props} />
      </section>
    )
  }

  return (
    <>
      {/* Mobile (< lg): collapsible via <details>, expanded by default. */}
      <details
        open
        className="lg:hidden bg-white rounded-2xl shadow-soft group"
        aria-label="Resumo do pedido"
      >
        <summary className="cursor-pointer list-none flex items-center justify-between px-4 py-3.5">
          <div className="flex flex-col">
            <span className="font-sans text-sm font-semibold text-andrequice-navy">
              Resumo do pedido
            </span>
            <span className="text-xs text-andrequice-border">
              {itemCount} {itemCount === 1 ? 'item' : 'itens'} · {totalFmt}
            </span>
          </div>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round"
            className="text-andrequice-border transition-transform group-open:rotate-180"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </summary>
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 border-t border-andrequice-sand">
          <SummaryBody {...props} />
        </div>
      </details>

      {/* Desktop (>= lg): always-visible card. */}
      <section
        aria-label="Resumo do pedido"
        className="hidden lg:block bg-white rounded-2xl shadow-soft p-5"
      >
        <h2 className="font-sans text-sm font-semibold text-andrequice-navy mb-3">
          Resumo do pedido
        </h2>
        <SummaryBody {...props} />
      </section>
    </>
  )
}

import { formatPrice } from '@/lib/utils'

interface ProductPriceTagProps {
  priceCents: number
  // Optional original price; when greater than priceCents the component
  // switches into "on-sale" mode: shows "De" struck-through, then the
  // current price extra-large, plus a "−X%" badge.
  compareAtPriceCents?: number | null
}

export function ProductPriceTag({ priceCents, compareAtPriceCents }: ProductPriceTagProps) {
  const hasCompare =
    typeof compareAtPriceCents === 'number' && compareAtPriceCents > priceCents

  if (!hasCompare) {
    // No promo — single big price.
    return (
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-3xl sm:text-4xl font-bold text-andrequice-navy tabular-nums">
          {formatPrice(priceCents / 100)}
        </span>
      </div>
    )
  }

  const compare = compareAtPriceCents as number
  const discountPct = Math.round(((compare - priceCents) / compare) * 100)

  return (
    <div className="flex flex-col gap-1.5">
      {/* "De R$ X,XX" — small, muted, struck-through */}
      <div className="flex items-baseline gap-2">
        <span className="font-sans text-[11px] uppercase tracking-wider text-andrequice-border">
          De
        </span>
        <span
          className="font-sans text-base text-andrequice-border line-through tabular-nums"
          aria-label={`Preço anterior ${formatPrice(compare / 100)}`}
        >
          {formatPrice(compare / 100)}
        </span>
      </div>

      {/* Current price + discount badge — the big statement */}
      <div className="flex items-end gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="font-sans text-xs uppercase tracking-wider font-semibold text-andrequice-copper">
            Por
          </span>
          <span className="font-serif text-4xl sm:text-5xl font-bold text-andrequice-copper tabular-nums leading-none">
            {formatPrice(priceCents / 100)}
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-full bg-andrequice-copper px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-soft mb-1"
          aria-label={`Desconto de ${discountPct} por cento`}
        >
          −{discountPct}%
        </span>
      </div>
    </div>
  )
}

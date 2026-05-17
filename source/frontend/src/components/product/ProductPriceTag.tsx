import { formatPrice } from '@/lib/utils'

interface ProductPriceTagProps {
  priceCents: number
  // Optional original price; rendered struck-through when greater than
  // priceCents. The Andrequicé public product serializer does not expose
  // compare_at_price today, but the prop is here so the moment that
  // capability lands the PDP picks it up without code changes.
  compareAtPriceCents?: number | null
}

export function ProductPriceTag({ priceCents, compareAtPriceCents }: ProductPriceTagProps) {
  const hasCompare =
    typeof compareAtPriceCents === 'number' &&
    compareAtPriceCents > priceCents

  return (
    <div className="flex items-baseline gap-3">
      <span className="font-serif text-2xl sm:text-3xl font-bold text-andrequice-navy tabular-nums">
        {formatPrice(priceCents / 100)}
      </span>
      {hasCompare && (
        <span
          className="font-sans text-sm text-andrequice-border line-through tabular-nums"
          aria-label={`Preço anterior ${formatPrice((compareAtPriceCents as number) / 100)}`}
        >
          {formatPrice((compareAtPriceCents as number) / 100)}
        </span>
      )}
    </div>
  )
}

import type { VariantStock } from '@/types/product'

// Andrequicé's public product serializer only exposes `size` per variant
// (color exists on the backend but is not surfaced). The picker therefore
// only renders the size dimension. Indisponível variants render disabled.

interface VariantPickerProps {
  variants: VariantStock[]
  selectedId: number | null
  onSelect: (variant: VariantStock) => void
  // Highlight in copper when the parent reports a "please select size" error.
  errorState?: boolean
}

const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'GGG', 'XGG', 'U'] as const
const sortVariants = (a: VariantStock, b: VariantStock): number => {
  const ai = SIZE_ORDER.indexOf(a.size as typeof SIZE_ORDER[number])
  const bi = SIZE_ORDER.indexOf(b.size as typeof SIZE_ORDER[number])
  if (ai === -1 && bi === -1) return a.size.localeCompare(b.size)
  if (ai === -1) return 1
  if (bi === -1) return -1
  return ai - bi
}

export function VariantPicker({ variants, selectedId, onSelect, errorState }: VariantPickerProps) {
  const sorted = [...variants].sort(sortVariants)
  const selected = sorted.find((v) => v.variantId === selectedId)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="font-sans text-sm font-medium text-andrequice-brown">
          Tamanho:
        </span>
        <span className="font-sans text-sm font-semibold text-andrequice-navy">
          {selected ? selected.size : '—'}
        </span>
      </div>

      <div role="radiogroup" aria-label="Tamanho" className="flex flex-wrap gap-2">
        {sorted.map((v) => {
          const outOfStock = v.stock === 0
          const isSelected = v.variantId === selectedId
          const priceLabel = `R$ ${v.effectivePrice.toFixed(2).replace('.', ',')}`

          return (
            <button
              key={v.variantId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Tamanho ${v.size} — ${priceLabel}${outOfStock ? ' — esgotado' : ''}`}
              disabled={outOfStock}
              title={outOfStock ? 'Esgotado' : `${v.stock} disponíveis · ${priceLabel}`}
              onClick={() => !outOfStock && onSelect(v)}
              className={[
                'min-w-[3rem] min-h-[44px] px-3 py-2 rounded-xl border-2 font-sans font-medium text-sm transition-all',
                'flex flex-col items-center justify-center gap-0.5',
                outOfStock
                  ? 'border-andrequice-sand text-andrequice-border/40 cursor-not-allowed line-through decoration-andrequice-border/40'
                  : isSelected
                  ? 'border-andrequice-gold bg-andrequice-gold/10 text-andrequice-navy'
                  : errorState
                  ? 'border-andrequice-copper/60 text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy'
                  : 'border-andrequice-sand text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy',
              ].join(' ')}
            >
              <span className="text-base leading-none">{v.size}</span>
              <span className={[
                'text-[10px] leading-none tabular-nums',
                outOfStock ? '' : 'text-andrequice-gold',
              ].join(' ')}>
                {priceLabel}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

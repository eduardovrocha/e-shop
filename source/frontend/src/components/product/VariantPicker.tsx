import type { FulfillmentMode, VariantStock } from '@/types/product'
import { isVariantPurchasable } from '@/utils/variant'

// Andrequicé's public product serializer only exposes `size` per variant
// (color exists on the backend but is not surfaced). The picker therefore
// only renders the size dimension. Indisponível variants render disabled.
//
// Availability is delegated to isVariantPurchasable so we don't treat
// stock=0 as "out of stock" for made_to_order products (where stock is
// always zero by design — the queue is the real gate, validated on the
// backend at create_intent).

interface VariantPickerProps {
  variants: VariantStock[]
  selectedId: number | null
  onSelect: (variant: VariantStock) => void
  // Used by isVariantPurchasable. Defaults to 'from_stock' for safety —
  // if a caller forgets to pass it, we keep the conservative gate.
  fulfillmentMode?: FulfillmentMode
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

export function VariantPicker({
  variants, selectedId, onSelect, fulfillmentMode = 'from_stock', errorState,
}: VariantPickerProps) {
  const sorted = [...variants].sort(sortVariants)
  const selected = sorted.find((v) => v.variantId === selectedId)
  const product = { fulfillmentMode }

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
          const purchasable = isVariantPurchasable(product, v)
          const isSelected  = v.variantId === selectedId
          const priceLabel  = `R$ ${v.effectivePrice.toFixed(2).replace('.', ',')}`
          // Disabled state means "cannot be selected/added". For from_stock
          // that's stock=0 (out-of-stock visuals); for made_to_order it
          // never fires because the queue is the gate (handled server-side).
          const disabled = !purchasable

          return (
            <button
              key={v.variantId}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Tamanho ${v.size} — ${priceLabel}${disabled ? ' — esgotado' : ''}`}
              disabled={disabled}
              title={disabled ? 'Esgotado' : `${priceLabel}${fulfillmentMode === 'from_stock' ? ` · ${v.stock} disponíveis` : ''}`}
              onClick={() => !disabled && onSelect(v)}
              className={[
                'min-w-[3rem] min-h-[44px] px-3 py-2 rounded-xl border-2 font-sans font-medium text-sm transition-all',
                'flex flex-col items-center justify-center gap-0.5',
                disabled
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
                disabled ? '' : 'text-andrequice-gold',
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

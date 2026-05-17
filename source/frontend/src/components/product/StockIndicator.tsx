import type { FulfillmentMode, VariantStock } from '@/types/product'

interface StockIndicatorProps {
  fulfillmentMode: FulfillmentMode
  leadTimeDays: number | null
  selectedVariant: VariantStock | null
  totalStock: number
}

// Renders one of four states:
//   - made_to_order: clock icon + "Pronta em até N dias após o pedido"
//   - from_stock + variant chosen + stock > 0: green check "Em estoque (N)"
//   - from_stock + variant chosen + stock = 0: muted "Esgotado"
//   - no variant chosen yet: neutral "Selecione um tamanho"
// All states are inline-flex with consistent height so the surrounding
// layout doesn't jump when the user picks a size.
export function StockIndicator({
  fulfillmentMode, leadTimeDays, selectedVariant, totalStock,
}: StockIndicatorProps) {
  if (fulfillmentMode === 'made_to_order') {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-andrequice-brown">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-andrequice-copper shrink-0" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>
          {leadTimeDays != null
            ? <>Pronta em até <strong className="text-andrequice-navy">{leadTimeDays} dias</strong> após o pedido</>
            : 'Feita sob encomenda'}
        </span>
      </div>
    )
  }

  if (!selectedVariant) {
    if (totalStock === 0) {
      return (
        <div className="inline-flex items-center gap-2 text-sm text-andrequice-copper">
          <span aria-hidden="true">●</span>
          <span>Esgotado</span>
        </div>
      )
    }
    return (
      <p className="text-sm text-andrequice-border">
        Selecione um tamanho para verificar disponibilidade.
      </p>
    )
  }

  if (selectedVariant.stock === 0) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-andrequice-copper">
        <span aria-hidden="true">●</span>
        <span>Tamanho {selectedVariant.size} esgotado</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 text-sm text-emerald-700">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>
        Em estoque
        {selectedVariant.stock <= 5 && (
          <> · <strong>apenas {selectedVariant.stock} {selectedVariant.stock === 1 ? 'unidade' : 'unidades'}</strong></>
        )}
      </span>
    </div>
  )
}

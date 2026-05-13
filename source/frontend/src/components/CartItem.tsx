import { useCartStore } from '@/store/cartStore'
import { PriceTag } from '@/components/PriceTag'
import { formatPrice } from '@/lib/utils'

interface CartItemProps {
  variantId: number
  name: string
  price: number
  quantity: number
  imageUrl?: string
  size?: string
  maxStock?: number
}

export function CartItem({ variantId, name, price, quantity, imageUrl, size, maxStock }: CartItemProps) {
  const { updateQuantity, removeItem } = useCartStore()
  const atLimit = maxStock !== undefined && quantity >= maxStock

  return (
    <li className="bg-white rounded-2xl overflow-hidden shadow-soft flex gap-3 p-3">
      {/* Thumbnail */}
      <div className="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-andrequice-sand">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-andrequice-border">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-serif font-semibold text-andrequice-navy text-sm leading-snug line-clamp-2">
              {name}
            </h4>
            {size && (
              <p className="text-xs text-andrequice-border mt-0.5">Tamanho: {size}</p>
            )}
          </div>
          <button
            onClick={() => removeItem(variantId)}
            aria-label={`Remover ${name} do carrinho`}
            className="flex-shrink-0 p-1 rounded-lg text-andrequice-border hover:text-andrequice-copper hover:bg-andrequice-sand transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity stepper */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateQuantity(variantId, quantity - 1)}
                aria-label="Diminuir quantidade"
                className="w-7 h-7 rounded-full border border-andrequice-border flex items-center justify-center text-andrequice-navy hover:border-andrequice-gold hover:text-andrequice-gold transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-sm font-medium text-andrequice-brown w-4 text-center">{quantity}</span>
              <button
                onClick={() => !atLimit && updateQuantity(variantId, quantity + 1)}
                aria-label="Aumentar quantidade"
                disabled={atLimit}
                className={[
                  'w-7 h-7 rounded-full border flex items-center justify-center transition-colors',
                  atLimit
                    ? 'border-andrequice-sand text-andrequice-border/40 cursor-not-allowed'
                    : 'border-andrequice-border text-andrequice-navy hover:border-andrequice-gold hover:text-andrequice-gold',
                ].join(' ')}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <line x1="6" y1="2" x2="6" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {atLimit && (
              <p className="text-[10px] text-andrequice-copper font-medium leading-none">
                Máximo disponível: {maxStock}
              </p>
            )}
          </div>

          {/* Price: unit × qty = subtotal */}
          <div className="text-right">
            {quantity > 1 && (
              <p className="text-[11px] text-andrequice-border leading-none mb-0.5 tabular-nums">
                {quantity}× {formatPrice(price)}
              </p>
            )}
            <PriceTag value={price * quantity} size="sm" />
          </div>
        </div>
      </div>
    </li>
  )
}

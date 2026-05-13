import { useNavigate } from 'react-router-dom'
import type { Product } from '@/types/product'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate()

  const badgeVariant = () => {
    if (!product.badge) return 'sand'
    if (product.badge.toLowerCase().includes('última')) return 'copper'
    if (product.badge.toLowerCase().includes('edição')) return 'navy'
    return 'gold'
  }

  return (
    <article className="rounded-3xl overflow-hidden bg-white shadow-card flex flex-col transition-shadow duration-200 hover:shadow-lg">
      {/* Image */}
      <button
        onClick={() => navigate(`/product/${product.id}`)}
        className="relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold"
        aria-label={`Ver ${product.name}`}
      >
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="w-full aspect-[4/5] object-cover transition-transform duration-300 hover:scale-105"
        />
        {product.badge && (
          <div className="absolute top-3 left-3">
            <Badge variant={badgeVariant() as 'gold' | 'sand' | 'navy' | 'copper'}>
              {product.badge}
            </Badge>
          </div>
        )}
        {product.stock <= 10 && (
          <div className="absolute top-3 right-3">
            <Badge variant="copper">{product.stock} restantes</Badge>
          </div>
        )}
      </button>

      {/* Info */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-serif font-semibold text-andrequice-navy text-base leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.variants
              .filter((v) => v.available && v.stock > 0)
              .map((v) => (
                <button
                  key={v.variantId}
                  onClick={() => navigate(`/product/${product.id}`)}
                  className="rounded-xl border-2 border-andrequice-sand text-andrequice-border font-sans font-medium text-sm flex flex-row items-center justify-center gap-1 h-10 px-3 hover:border-andrequice-gold hover:text-andrequice-navy transition-all duration-150 active:scale-95"
                  aria-label={`${product.name} tamanho ${v.size} — R$${v.effectivePrice.toFixed(2).replace('.', ',')}`}
                >
                  <span>{v.size}</span>
                  <span className="text-xs leading-none font-normal tabular-nums text-andrequice-gold">
                    R${v.effectivePrice.toFixed(2).replace('.', ',')}
                  </span>
                </button>
              ))}
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          fullWidth
          onClick={() => navigate(`/product/${product.id}`)}
        >
          Ver Produto
        </Button>
      </div>
    </article>
  )
}

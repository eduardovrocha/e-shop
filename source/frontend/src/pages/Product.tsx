import { useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { MobileBottomBar } from '@/components/MobileBottomBar'
import { Badge } from '@/components/Badge'
import { PriceTag } from '@/components/PriceTag'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/LoadingSkeleton'
import { useCartStore } from '@/store/cartStore'
import { useProduct } from '@/hooks/useProducts'
import type { VariantStock } from '@/types/product'

export default function Product() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)

  const { product, isLoading } = useProduct(Number(id))

  const cartItems = useCartStore((s) => s.items)
  const [activeImage, setActiveImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<VariantStock | null>(null)
  const [added, setAdded] = useState(false)
  const [sizeError, setSizeError] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)

  const displayPrice = useMemo(
    () => selectedVariant?.effectivePrice ?? product?.minPrice ?? 0,
    [selectedVariant, product?.minPrice],
  )


  const handleAddToCart = useCallback(() => {
    if (!selectedVariant) {
      setSizeError(true)
      return
    }
    if (!product) return
    if (selectedVariant.stock === 0) return

    const alreadyInCart = cartItems.find((i) => i.variantId === selectedVariant.variantId)?.quantity ?? 0
    if (alreadyInCart >= selectedVariant.stock) {
      setStockError(
        selectedVariant.stock === 1
          ? 'Apenas 1 unidade disponível — já está no seu carrinho'
          : `Quantidade máxima disponível: ${selectedVariant.stock} unidades — você já tem ${alreadyInCart} no carrinho`
      )
      return
    }

    setSizeError(false)
    setStockError(null)
    addItem({
      id:        product.id,
      variantId: selectedVariant.variantId,
      name:      product.name,
      size:      selectedVariant.size,
      price:     selectedVariant.effectivePrice,
      quantity:  1,
      imageUrl:  product.images[0],
      fulfillmentMode:        product.fulfillmentMode,
      productionLeadTimeDays: product.productionLeadTimeDays,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }, [selectedVariant, product, addItem, cartItems])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack transparent />
        <Skeleton className="aspect-[4/5] max-h-[65vh] w-full rounded-none" />
        <div className="max-w-2xl mx-auto w-full px-4 pt-6 flex flex-col gap-4">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Header showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8 py-16">
            <p className="font-serif text-2xl text-andrequice-navy mb-2">Produto não encontrado</p>
            <Button variant="ghost" onClick={() => navigate('/catalog')}>
              Ver catálogo
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const totalStock = product.stock
  const isOutOfStock = totalStock === 0

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header showBack transparent />

      {/* Image Gallery */}
      <div className="bg-andrequice-sand">
        <div className="max-w-2xl mx-auto w-full relative">
          <div className="w-full aspect-[4/5] max-h-[65vh] overflow-hidden">
            <img
              key={activeImage}
              src={product.images[activeImage]}
              alt={`${product.name} — foto ${activeImage + 1}`}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Image dots */}
          {product.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {product.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  aria-label={`Foto ${idx + 1}`}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === activeImage
                      ? 'bg-andrequice-gold w-5'
                      : 'bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Image nav arrows */}
          {product.images.length > 1 && (
            <>
              <button
                onClick={() => setActiveImage((prev) => (prev - 1 + product.images.length) % product.images.length)}
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-soft"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={() => setActiveImage((prev) => (prev + 1) % product.images.length)}
                aria-label="Próxima foto"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm flex items-center justify-center shadow-soft"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </>
          )}

          {product.badge && (
            <div className="absolute top-4 left-4">
              <Badge variant="gold">{product.badge}</Badge>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto w-full px-4 pt-6 pb-36 flex flex-col gap-6">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <h1 className="font-serif text-2xl font-semibold text-andrequice-navy tracking-display leading-tight">
            {product.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={product.fulfillmentMode === 'made_to_order' ? 'copper' : 'sand'}>
              {product.fulfillmentMode === 'made_to_order' ? 'Sob encomenda' : 'Pronta entrega'}
            </Badge>
            {totalStock > 0 && totalStock <= 10 && (
              <Badge variant="copper">{totalStock} restantes</Badge>
            )}
          </div>
          {product.fulfillmentMode === 'made_to_order' && product.productionLeadTimeDays != null && (
            <p className="font-sans text-xs text-andrequice-brown/80 mt-1">
              Pronta em até {product.productionLeadTimeDays} dias após o pedido
            </p>
          )}
        </div>

        {/* Size selector — primary interaction, sits right below title */}
        {product.variants.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border">
                Tamanho
              </h2>
              {sizeError && (
                <p className="text-xs text-andrequice-copper font-medium">Selecione um tamanho</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {product.variants.map((variant) => {
                const outOfStock = variant.stock === 0
                const isSelected = selectedVariant?.variantId === variant.variantId
                const priceLabel = `R$${variant.effectivePrice.toFixed(2).replace('.', ',')}`

                return (
                  <button
                    key={variant.variantId}
                    onClick={() => {
                      if (outOfStock) return
                      setSelectedVariant(variant)
                      setSizeError(false)
                      setStockError(null)
                    }}
                    aria-label={`Tamanho ${variant.size} — ${priceLabel}${outOfStock ? ' — esgotado' : ''}`}
                    aria-pressed={isSelected}
                    disabled={outOfStock}
                    title={outOfStock ? 'Esgotado' : `${variant.stock} disponíveis`}
                    className={[
                      'rounded-xl border-2 font-sans font-medium text-sm transition-all duration-150 flex flex-row items-center justify-center gap-1 h-10 px-3',
                      outOfStock
                        ? 'border-andrequice-sand text-andrequice-border/40 cursor-not-allowed'
                        : isSelected
                        ? 'border-andrequice-gold bg-andrequice-gold/10 text-andrequice-navy active:scale-95'
                        : sizeError
                        ? 'border-andrequice-copper/60 text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy active:scale-95'
                        : 'border-andrequice-sand text-andrequice-border hover:border-andrequice-gold hover:text-andrequice-navy active:scale-95',
                    ].join(' ')}
                  >
                    <span>{variant.size}</span>
                    <span className={[
                      'text-xs leading-none font-normal tabular-nums',
                      outOfStock ? 'line-through' : 'text-andrequice-gold',
                    ].join(' ')}>
                      {priceLabel}
                    </span>
                    {outOfStock && <span className="sr-only"> (esgotado)</span>}
                  </button>
                )
              })}
            </div>
            {selectedVariant && selectedVariant.stock <= 5 && selectedVariant.stock > 0 && !stockError && (
              <p className="text-xs text-andrequice-copper font-medium">
                Atenção: apenas {selectedVariant.stock} unidade{selectedVariant.stock !== 1 ? 's' : ''} no tamanho {selectedVariant.size}
              </p>
            )}
            {stockError && (
              <p className="text-xs text-andrequice-copper font-medium">{stockError}</p>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-andrequice-sand" />

        {/* Description */}
        <div className="flex flex-col gap-2">
          <h2 className="font-sans text-xs font-semibold uppercase tracking-widest text-andrequice-border">
            Sobre a peça
          </h2>
          <p className="font-sans text-sm text-andrequice-brown leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Quality badge */}
        <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-soft">
          <div className="w-10 h-10 rounded-full bg-andrequice-gold/10 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-andrequice-gold">
              <path d="M12 2l2.09 6.26L20 9.27l-5 4.87 1.18 6.88L12 17.77l-4.18 3.25L9 14.14 4 9.27l5.91-.91L12 2z" fill="currentColor" />
            </svg>
          </div>
          <div>
            <p className="font-sans font-semibold text-andrequice-navy text-sm">Artesanal e Premium</p>
            <p className="font-sans text-xs text-andrequice-border leading-relaxed mt-0.5">
              Algodão 100% penteado · Arte exclusiva · Produção local
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <MobileBottomBar>
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-andrequice-border font-sans">
              {selectedVariant ? `Tamanho ${selectedVariant.size}` : 'Preço'}
            </span>
            <div key={displayPrice} className="animate-price-pop">
              <PriceTag value={displayPrice} size="lg" />
            </div>
          </div>
          <Button
            variant={added ? 'gold' : 'primary'}
            size="lg"
            fullWidth
            onClick={handleAddToCart}
            disabled={isOutOfStock}
          >
            {isOutOfStock
              ? 'Esgotado'
              : added
              ? '✓ Adicionado'
              : 'Adicionar ao Carrinho'}
          </Button>
        </div>
      </MobileBottomBar>
    </div>
  )
}

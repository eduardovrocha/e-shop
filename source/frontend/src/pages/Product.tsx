import { useCallback, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Skeleton } from '@/components/LoadingSkeleton'
import { ProductGallery } from '@/components/product/ProductGallery'
import { VariantPicker } from '@/components/product/VariantPicker'
import { StockIndicator } from '@/components/product/StockIndicator'
import { ProductPriceTag } from '@/components/product/ProductPriceTag'
import { useCartStore } from '@/store/cartStore'
import { useProduct } from '@/hooks/useProducts'
import type { VariantStock } from '@/types/product'
import { isVariantPurchasable, maxPurchasableQuantity } from '@/utils/variant'

const DESCRIPTION_TRUNCATE_LENGTH = 240

export default function Product() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addItem = useCartStore((s) => s.addItem)
  const cartItems = useCartStore((s) => s.items)

  const { product, isLoading } = useProduct(Number(id))

  const [selectedVariant, setSelectedVariant] = useState<VariantStock | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const [sizeError, setSizeError] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────
  const displayCents = useMemo(
    () => Math.round((selectedVariant?.effectivePrice ?? product?.minPrice ?? 0) * 100),
    [selectedVariant, product?.minPrice]
  )

  const inCart = useMemo(() => {
    if (!selectedVariant) return 0
    return cartItems.find((i) => i.variantId === selectedVariant.variantId)?.quantity ?? 0
  }, [cartItems, selectedVariant])

  // Max quantity in the stepper:
  //   - made_to_order: cap of 99 (UI only — capacity validated server-side)
  //   - from_stock:    remaining free stock minus what is already in cart
  const maxQuantity = selectedVariant && product
    ? Math.max(
        1,
        product.fulfillmentMode === 'made_to_order'
          ? maxPurchasableQuantity(product, selectedVariant)
          : selectedVariant.stock - inCart
      )
    : 1

  // CTA enables when the variant is selected AND purchasable AND
  // (for from_stock) the cart does not already hold all stock.
  const canAdd =
    !!selectedVariant && !!product &&
    isVariantPurchasable(product, selectedVariant) &&
    (product.fulfillmentMode === 'made_to_order' || inCart < selectedVariant.stock)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectVariant = useCallback((v: VariantStock) => {
    setSelectedVariant(v)
    setSizeError(false)
    setStockError(null)
    setQuantity(1)
  }, [])

  const handleQty = useCallback((delta: number) => {
    setQuantity((q) => Math.max(1, Math.min(maxQuantity, q + delta)))
  }, [maxQuantity])

  const handleAddToCart = useCallback(() => {
    if (!selectedVariant) {
      setSizeError(true)
      return
    }
    if (!product) return
    if (product.fulfillmentMode === 'from_stock' && selectedVariant.stock === 0) return

    if (product.fulfillmentMode === 'from_stock') {
      const wouldHave = inCart + quantity
      if (wouldHave > selectedVariant.stock) {
        setStockError(
          selectedVariant.stock === 1
            ? 'Apenas 1 unidade disponível — já está no seu carrinho'
            : `Quantidade máxima disponível: ${selectedVariant.stock} unidades — você já tem ${inCart} no carrinho`
        )
        return
      }
    }

    setSizeError(false)
    setStockError(null)
    addItem({
      id:        product.id,
      variantId: selectedVariant.variantId,
      name:      product.name,
      size:      selectedVariant.size,
      price:     selectedVariant.effectivePrice,
      quantity,
      imageUrl:  product.images[0],
      fulfillmentMode:        product.fulfillmentMode,
      productionLeadTimeDays: product.productionLeadTimeDays,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }, [selectedVariant, product, addItem, inCart, quantity])

  // ── Loading / error states ───────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-andrequice-cream/40 flex flex-col">
        <Header showBack />
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-andrequice-cream/40 flex flex-col">
        <Header showBack />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-8 py-16">
            <p className="font-serif text-2xl text-andrequice-navy mb-2">Produto não encontrado</p>
            <Button variant="ghost" onClick={() => navigate('/catalog')}>
              Ver catálogo
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const isMTO = product.fulfillmentMode === 'made_to_order'
  const description = product.description ?? ''
  const isLong = description.length > DESCRIPTION_TRUNCATE_LENGTH
  const shownDescription = !isLong || descriptionExpanded
    ? description
    : `${description.slice(0, DESCRIPTION_TRUNCATE_LENGTH).trimEnd()}…`

  return (
    <div className="min-h-screen bg-andrequice-cream/40 flex flex-col">
      <Header showBack />

      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10 pb-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* ── Left: gallery ─────────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-6 h-fit">
            <ProductGallery images={product.images} productName={product.name} />
          </div>

          {/* ── Right: info + actions ─────────────────────────────────────── */}
          <div className="flex flex-col gap-5">
            {/* 1. Category */}
            {product.category && (
              <button
                type="button"
                onClick={() => navigate('/catalog')}
                className="self-start text-xs font-medium uppercase tracking-wider text-andrequice-border hover:text-andrequice-navy transition-colors"
              >
                {product.category}
              </button>
            )}

            {/* 2. Name */}
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-andrequice-navy leading-tight">
              {product.name}
            </h1>

            {/* 3. Modality badge + low-stock badge */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isMTO ? 'copper' : 'sand'}>
                {isMTO ? 'Sob encomenda' : 'Pronta entrega'}
              </Badge>
              {!isMTO && product.stock > 0 && product.stock <= 10 && (
                <Badge variant="copper">{product.stock} restantes</Badge>
              )}
            </div>

            {/* 4. Price */}
            <ProductPriceTag priceCents={displayCents} />

            {/* 5. Description */}
            {description && (
              <div>
                <p className="font-sans text-sm text-andrequice-brown leading-relaxed whitespace-pre-line">
                  {shownDescription}
                </p>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setDescriptionExpanded((v) => !v)}
                    className="mt-1 text-xs font-medium text-andrequice-gold hover:text-andrequice-copper transition-colors"
                  >
                    {descriptionExpanded ? 'Ver menos' : 'Ver mais'}
                  </button>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-andrequice-sand" />

            {/* 7. Size picker */}
            {product.variants.length > 0 && (
              <VariantPicker
                variants={product.variants}
                selectedId={selectedVariant?.variantId ?? null}
                onSelect={handleSelectVariant}
                fulfillmentMode={product.fulfillmentMode}
                errorState={sizeError}
              />
            )}
            {sizeError && (
              <p className="text-xs text-andrequice-copper font-medium -mt-2">
                Selecione um tamanho para continuar.
              </p>
            )}

            {/* 8. Stock indicator */}
            <StockIndicator
              fulfillmentMode={product.fulfillmentMode}
              leadTimeDays={product.productionLeadTimeDays}
              selectedVariant={selectedVariant}
              totalStock={product.stock}
            />

            {stockError && (
              <p className="text-xs text-andrequice-copper font-medium">{stockError}</p>
            )}

            {/* 9. Quantity + Add to cart */}
            <div className="flex items-center gap-3 pt-1">
              {/* Quantity stepper */}
              <div className="flex items-center gap-2 h-12 px-2 rounded-xl border-2 border-andrequice-sand">
                <button
                  type="button"
                  onClick={() => handleQty(-1)}
                  disabled={quantity <= 1}
                  aria-label="Diminuir quantidade"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-andrequice-navy hover:bg-andrequice-sand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium text-andrequice-navy tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleQty(1)}
                  disabled={!selectedVariant || (!isMTO && quantity >= maxQuantity)}
                  aria-label="Aumentar quantidade"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-andrequice-navy hover:bg-andrequice-sand disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
              </div>

              <Button
                variant={added ? 'gold' : 'primary'}
                size="lg"
                fullWidth
                onClick={handleAddToCart}
                disabled={!canAdd && !sizeError /* allow click on no-selection to show inline error */}
              >
                {added
                  ? '✓ Adicionado'
                  : !selectedVariant
                    ? 'Selecione um tamanho'
                    : isMTO
                      ? 'Adicionar ao Carrinho'
                      : selectedVariant.stock === 0
                        ? 'Esgotado'
                        : 'Adicionar ao Carrinho'}
              </Button>
            </div>

            {/* Decorative quality card — already part of the brand voice on the
                 site, kept as part of the info column. */}
            <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-soft mt-2">
              <div className="w-10 h-10 rounded-full bg-andrequice-gold/10 flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-andrequice-gold" aria-hidden="true">
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
        </div>
      </div>

      <Footer />
    </div>
  )
}

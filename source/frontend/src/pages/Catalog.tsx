import { useState, useMemo } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { ProductCardSkeleton } from '@/components/LoadingSkeleton'
import { CategoryDropdown } from '@/components/CategoryDropdown'
import { useProducts } from '@/hooks/useProducts'
import { useStoreSettings } from '@/hooks/useStoreSettings'
import { useCategories } from '@/hooks/useCategories'

export default function Catalog() {
  const { products, isLoading, error } = useProducts()
  const settings = useStoreSettings()
  const categories = useCategories(products)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categoryCounts = useMemo(
    () => products.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1
      return acc
    }, {}),
    [products]
  )

  const visibleProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-4 py-14 flex flex-col items-center text-center gap-4">
          {/* Ornament */}
          <div className="flex items-center gap-3 mb-1">
            <div className="h-px w-10 bg-andrequice-gold/60" />
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className="text-andrequice-gold"
            >
              <path
                d="M12 2l2.09 6.26L20 9.27l-5 4.87 1.18 6.88L12 17.77l-4.18 3.25L9 14.14 4 9.27l5.91-.91L12 2z"
                fill="currentColor"
              />
            </svg>
            <div className="h-px w-10 bg-andrequice-gold/60" />
          </div>

          <h1 className="font-serif text-4xl font-semibold text-andrequice-navy tracking-display leading-tight">
            {settings.headline_primary}
            <br />
            <span className="font-light">{settings.headline_secondary}</span>
          </h1>

          <p className="font-sans text-sm text-andrequice-brown/80 max-w-xs leading-relaxed">
            {settings.headline_description}
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-6xl mx-auto px-4 pb-10 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          {!isLoading && categories.length > 0 && (
            <CategoryDropdown
              categories={categories}
              selected={selectedCategory}
              onChange={setSelectedCategory}
              counts={categoryCounts}
              totalCount={products.length}
            />
          )}
          <p className="text-sm text-andrequice-border font-sans leading-relaxed text-right">
            {isLoading
              ? 'Carregando...'
              : `${visibleProducts.length} peça${visibleProducts.length !== 1 ? 's' : ''} disponíve${visibleProducts.length !== 1 ? 'is' : 'l'}`}
          </p>
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-sans text-sm text-andrequice-brown/70">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-andrequice-gold underline"
            >
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : visibleProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
        )}
      </section>
    </div>
  )
}

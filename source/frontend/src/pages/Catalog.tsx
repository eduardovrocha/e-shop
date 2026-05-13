import { ProductCard } from '@/components/ProductCard'
import { SectionTitle } from '@/components/SectionTitle'
import { ProductCardSkeleton } from '@/components/LoadingSkeleton'
import { useProducts } from '@/hooks/useProducts'
import { useStoreSettings } from '@/hooks/useStoreSettings'

export default function Catalog() {
  const { products, isLoading, error } = useProducts()
  const settings = useStoreSettings()

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
      <section className="max-w-2xl mx-auto px-4 pb-10 pt-8">
        <SectionTitle
          title="Coleção"
          subtitle={isLoading ? 'Carregando...' : `${products.length} peças disponíveis`}
          className="mb-6"
        />

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
          <div className="flex flex-col gap-4">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
          </div>
        )}
      </section>
    </div>
  )
}

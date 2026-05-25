import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '@/store/cartStore'

interface HeaderProps {
  showBack?: boolean
  title?: string
  transparent?: boolean
}

export function Header({ showBack = false, title, transparent = false }: HeaderProps) {
  const navigate = useNavigate()
  const itemCount = useCartStore((s) => s.itemCount())

  return (
    <header
      className={`sticky top-0 z-40 ${
        transparent
          ? 'bg-andrequice-cream/80 backdrop-blur-md'
          : 'bg-andrequice-cream'
      } border-b border-andrequice-sand`}
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-[40px]">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              aria-label="Voltar"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-andrequice-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold focus-visible:ring-offset-1"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-andrequice-navy"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
            </button>
          ) : (
            <Link
              to="/"
              aria-label="Ir para início"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-andrequice-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold focus-visible:ring-offset-1"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-andrequice-navy"
              >
                <path d="M3 11l9-8 9 8" />
                <path d="M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10" />
              </svg>
            </Link>
          )}
        </div>

        {/* Center */}
        <Link
          to="/"
          className="absolute left-1/2 -translate-x-1/2 font-serif text-2xl font-semibold text-andrequice-navy hover:text-andrequice-copper transition-colors"
          aria-label="Ir para início"
        >
          {title ?? 'Andrequicé Store'}
        </Link>

        {/* Right — Catalog + Cart */}
        <Link
          to="/catalog"
          aria-label="Ver catálogo"
          className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-andrequice-sand transition-colors ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold focus-visible:ring-offset-1"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-andrequice-navy"
          >
            <path d="M3 9l1.5-5h15L21 9" />
            <path d="M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9" />
            <path d="M3 9h18" />
            <path d="M9 13h6" />
          </svg>
        </Link>
        <Link
          to="/cart"
          aria-label={`Carrinho com ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
          className="relative w-11 h-11 flex items-center justify-center rounded-full hover:bg-andrequice-sand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold focus-visible:ring-offset-1"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-andrequice-navy"
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <path d="M16 10a4 4 0 01-8 0" />
          </svg>
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-andrequice-gold text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
              {itemCount > 9 ? '9+' : itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  )
}

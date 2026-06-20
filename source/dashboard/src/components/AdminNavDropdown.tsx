import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  CreditCard,
  Factory,
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Pedidos', icon: ShoppingBag },
  { to: '/orders/new', label: 'Novo pedido', icon: PlusCircle, end: true },
  { to: '/production', label: 'Produção', icon: Factory },
  { to: '/products', label: 'Produtos', icon: Package },
  { to: '/inventory', label: 'Estoque', icon: Warehouse },
  { to: '/customers', label: 'Clientes', icon: Users },
  { to: '/coupons', label: 'Cupons', icon: Tag },
  { to: '/shipping', label: 'Frete', icon: Truck },
  { to: '/stripe', label: 'Stripe', icon: CreditCard },
  { to: '/settings', label: 'Configurações', icon: Settings },
]

function matchItem(pathname: string): NavItem {
  const exact = NAV_ITEMS.find((item) => item.end && item.to === pathname)
  if (exact) return exact
  const prefix = NAV_ITEMS
    .filter((item) => !item.end && pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return prefix ?? NAV_ITEMS[0]
}

export function AdminNavDropdown() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(-1)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const active = matchItem(pathname)

  const close = useCallback(() => {
    setOpen(false)
    setFocused(-1)
  }, [])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !panelRef.current?.contains(e.target as Node)
      ) {
        close()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, close])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    if (focused >= 0) itemRefs.current[focused]?.focus()
  }, [focused])

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setOpen(true)
      setFocused(0)
    }
  }

  function handleItemKeyDown(e: React.KeyboardEvent, idx: number) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocused(Math.min(idx + 1, NAV_ITEMS.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (idx === 0) {
        close()
        triggerRef.current?.focus()
      } else {
        setFocused(idx - 1)
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectItem(NAV_ITEMS[idx])
    }
  }

  function selectItem(item: NavItem) {
    close()
    triggerRef.current?.focus()
    if (item.to !== pathname) navigate(item.to)
  }

  const ActiveIcon = active.icon

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu de navegação"
        data-testid="admin-nav-trigger"
        onClick={() => {
          setOpen((v) => !v)
          setFocused(-1)
        }}
        onKeyDown={handleTriggerKeyDown}
        className="flex max-w-[60vw] items-center gap-2 rounded-2xl border border-andrequice-sand bg-white px-3.5 py-2 text-sm font-medium text-andrequice-navy shadow-soft transition-colors hover:border-andrequice-gold hover:bg-andrequice-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-andrequice-gold"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-andrequice-cream text-andrequice-navy">
          <ActiveIcon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate">{active.label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="menu"
          aria-label="Navegação do admin"
          className="absolute left-0 top-full z-50 mt-2 w-64 origin-top-left animate-dropdown overflow-hidden rounded-2xl border border-andrequice-sand bg-white shadow-card"
        >
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon
            const isActive = item.to === active.to
            return (
              <button
                key={item.to}
                ref={(el) => {
                  itemRefs.current[idx] = el
                }}
                role="menuitem"
                type="button"
                tabIndex={focused === idx ? 0 : -1}
                onKeyDown={(e) => handleItemKeyDown(e, idx)}
                onClick={() => selectItem(item)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-andrequice-cream focus-visible:bg-andrequice-cream focus-visible:outline-none',
                  isActive && 'bg-andrequice-cream/60'
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-andrequice-cream text-andrequice-navy transition-colors',
                    isActive && 'ring-1 ring-andrequice-gold/40'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-snug text-andrequice-navy">
                    {item.label}
                  </span>
                </span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-andrequice-gold" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

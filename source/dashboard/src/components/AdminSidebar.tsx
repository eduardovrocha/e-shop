import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  Warehouse,
  Users,
  Truck,
  Settings,
  Factory,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/store/uiStore'
import { Button } from './ui/button'

const navItems = [
  { to: '/settings', label: 'Configurações', icon: Settings },
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/orders', label: 'Pedidos', icon: ShoppingBag },
  { to: '/production', label: 'Produção', icon: Factory },
  { to: '/products', label: 'Produtos', icon: Package },
  { to: '/inventory', label: 'Estoque', icon: Warehouse },
  { to: '/customers', label: 'Clientes', icon: Users },
  // Cupons: backend não implementado — ocultar do menu até a feature estar pronta
  // { to: '/coupons', label: 'Cupons', icon: Tag },
  { to: '/shipping', label: 'Frete', icon: Truck },
]

export function AdminSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-full w-64 flex-col bg-brand-navy transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div>
            <span className="font-serif text-lg font-semibold text-white">Andrequicé</span>
            <p className="text-[10px] font-medium uppercase tracking-widest text-white/50">
              Admin
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/60 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map(({ to, label, icon: Icon, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false)
                  }}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    )
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-[10px] text-white/30">Festa de Andrequicé © 2025</p>
        </div>
      </aside>
    </>
  )
}

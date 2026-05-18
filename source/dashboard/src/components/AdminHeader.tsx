import { useRef, useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Menu, Bell, LogOut, ChevronDown, HelpCircle } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import api from '@/services/api'
import { useOrderNotifications } from '@/hooks/useOrderNotifications'
import { NotificationDropdown } from './NotificationDropdown'
import { useTour } from './onboarding/useTour'

export function AdminHeader() {
  const { toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()
  const { requestReplay } = useTour()

  const { orders, unreadCount, markAsRead, markAllAsRead, connectionStatus } = useOrderNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)

  const handleLogout = async () => {
    try {
      await api.delete('/admin/auth/logout')
    } catch {
      // proceed with local logout even if server call fails
    }
    logout()
    window.location.href = '/login'
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/80 px-4 backdrop-blur-sm lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Connection status pill */}
        {connectionStatus !== 'connected' && (
          <span className="hidden sm:flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            <span className={[
              'h-1.5 w-1.5 rounded-full',
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-red-400',
            ].join(' ')} />
            {connectionStatus === 'connecting' ? 'conectando...' : 'desconectado'}
          </span>
        )}

        {/* Notifications */}
        <div className="relative">
          <Button
            ref={bellRef}
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notificações"
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell className={[
              'h-4 w-4 transition-transform',
              unreadCount > 0 && !notifOpen ? 'animate-[wiggle_0.4s_ease-in-out]' : '',
            ].join(' ')} />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[9px]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>

          <NotificationDropdown
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            orders={orders}
            unreadCount={unreadCount}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            triggerRef={bellRef}
          />
        </div>

        {/* User menu — Radix dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted data-[state=open]:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Menu do usuário"
              data-testid="user-menu-trigger"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? 'A'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium leading-tight">{user?.name ?? 'Admin'}</p>
                <p className="text-[10px] text-muted-foreground">{user?.email ?? 'admin@andrequice.com.br'}</p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[200px] overflow-hidden rounded-md border border-border bg-card p-1 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
            >
              <DropdownMenu.Item
                onSelect={requestReplay}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-muted focus:bg-muted"
                data-testid="user-menu-replay-tour"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                Refazer tour
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="my-1 h-px bg-border" />

              <DropdownMenu.Item
                onSelect={handleLogout}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive outline-none data-[highlighted]:bg-destructive/10 focus:bg-destructive/10"
                data-testid="user-menu-logout"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}

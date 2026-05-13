import { useRef, useState } from 'react'
import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import api from '@/services/api'
import { useOrderNotifications } from '@/hooks/useOrderNotifications'
import { NotificationDropdown } from './NotificationDropdown'

export function AdminHeader() {
  const { toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()

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
            connectionStatus={connectionStatus}
            markAsRead={markAsRead}
            markAllAsRead={markAllAsRead}
            triggerRef={bellRef}
          />
        </div>

        {/* User menu */}
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-navy text-xs font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? 'A'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-medium leading-tight">{user?.name ?? 'Admin'}</p>
            <p className="text-[10px] text-muted-foreground">{user?.email ?? 'admin@andrequice.com.br'}</p>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

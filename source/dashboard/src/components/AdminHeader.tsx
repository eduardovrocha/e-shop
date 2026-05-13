import { Menu, Bell, LogOut, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import api from '@/services/api'

export function AdminHeader() {
  const { toggleSidebar } = useUIStore()
  const { user, logout } = useAuthStore()

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
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 w-4 items-center justify-center p-0 text-[9px]"
          >
            3
          </Badge>
        </Button>

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

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AdminUser } from '@/types/auth'

interface AuthState {
  user: AdminUser | null
  isAuthenticated: boolean
  setAuth: (user: AdminUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      setAuth: (user) => {
        set({ user, isAuthenticated: true })
      },
      logout: () => {
        set({ user: null, isAuthenticated: false })
      },
    }),
    { name: 'andrequice-admin-auth' }
  )
)

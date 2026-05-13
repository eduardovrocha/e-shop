import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface Props {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: Props) {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  // TODO: when User.role is implemented, enforce admin check:
  // if (requireAdmin && user?.role !== 'admin') return <Navigate to="/" replace />
  void requireAdmin

  return <>{children}</>
}

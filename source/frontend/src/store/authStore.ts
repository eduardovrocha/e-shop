import { create } from 'zustand'

// O frontend público não possui autenticação de usuário.
// Autenticação administrativa é gerenciada exclusivamente pelo dashboard
// em porta separada, com HttpOnly cookie via api/v1/admin/auth.
interface AuthState {
  isAuthenticated: false
}

export const useAuthStore = create<AuthState>()(() => ({
  isAuthenticated: false,
}))

export interface AdminUser {
  id: number
  name: string
  email: string
  role: 'admin' | 'super_admin'
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: AdminUser
}

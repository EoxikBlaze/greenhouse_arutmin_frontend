export type Role = 'admin' | 'petani' | 'demo'

export type AuthUser = {
  id: number
  name: string
  username: string
  level: Role
}

export type AuthState = {
  isAuthenticated: boolean
  role: Role | null
  user: AuthUser | null
  demoMode: boolean
}

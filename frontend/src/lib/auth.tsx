import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiClient, tokenStore } from './apiClient'
import type { Role, User } from './types'

interface RegisterInput {
  fullName: string
  email: string
  password: string
  college?: string
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (input: RegisterInput) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

interface MeResponse {
  id: string
  email: string
  role: Role
  full_name: string | null
}

function toUser(me: MeResponse): User {
  return { id: me.id, email: me.email, role: me.role, fullName: me.full_name ?? me.email }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // On boot: if we have a token, fetch the current user.
  useEffect(() => {
    let cancelled = false
    if (!tokenStore.access) {
      setLoading(false)
      return
    }
    apiClient
      .get<MeResponse>('/auth/me')
      .then((res) => {
        if (!cancelled) setUser(toUser(res.data))
      })
      .catch(() => {
        tokenStore.clear()
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const res = await apiClient.post('/auth/login', { email, password })
        tokenStore.set(res.data.access_token, res.data.refresh_token)
        const me = await apiClient.get<MeResponse>('/auth/me')
        const u = toUser(me.data)
        setUser(u)
        return u
      },
      register: async (input) => {
        const res = await apiClient.post('/auth/register', {
          full_name: input.fullName,
          email: input.email,
          password: input.password,
          college: input.college || null,
        })
        tokenStore.set(res.data.access_token, res.data.refresh_token)
        const me = await apiClient.get<MeResponse>('/auth/me')
        const u = toUser(me.data)
        setUser(u)
        return u
      },
      logout: () => {
        tokenStore.clear()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const HOME_FOR: Record<Role, string> = {
  student: '/app',
  authority: '/authority',
  admin: '/admin',
}

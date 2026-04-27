import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { supabase } from '../services/supabase'
import type { Employee } from '../types'

type AuthUser = {
  id: string
  name: string
  login: string | null
  role: 'admin' | 'employee'
}

type AuthContextValue = {
  isLoading: boolean
  session: { userId: string } | null
  user: AuthUser | null
  signInWithPassword: (args: { login: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)
const LS_AUTH_USER_ID = 'tt.auth.userId'
const LS_AUTH_REVOKED = 'tt.auth.revoked'
const ACCESS_REVOKED_TEXT = 'У вас больше нет доступа в таск-трекер ANSARA'

export function AuthProvider({ children }: PropsWithChildren) {
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<AuthUser | null>(null)

  const signOut = useCallback(async () => {
    localStorage.removeItem(LS_AUTH_USER_ID)
    setUser(null)
  }, [])

  useEffect(() => {
    let mounted = true
    const storedId = localStorage.getItem(LS_AUTH_USER_ID)
    if (!storedId) {
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('id, name, login, role, is_hidden')
          .eq('id', storedId)
          .maybeSingle()
        if (!mounted) return
        if (error || !data || (data as Employee).is_hidden) {
          localStorage.removeItem(LS_AUTH_USER_ID)
          localStorage.setItem(LS_AUTH_REVOKED, ACCESS_REVOKED_TEXT)
          setUser(null)
          return
        }
        const row = data as Pick<Employee, 'id' | 'name' | 'login' | 'role'>
        setUser({
          id: row.id,
          name: row.name,
          login: row.login ?? null,
          role: row.role ?? 'employee',
        })
      } finally {
        if (!mounted) return
        setIsLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`employee-auth-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'employees', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as Partial<Employee> | null
          if (!next) return
          if (next.is_hidden) {
            localStorage.setItem(LS_AUTH_REVOKED, ACCESS_REVOKED_TEXT)
            localStorage.removeItem(LS_AUTH_USER_ID)
            setUser(null)
            return
          }
          setUser((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              name: typeof next.name === 'string' ? next.name : prev.name,
              login: typeof next.login === 'string' ? next.login : prev.login,
              role: next.role === 'admin' || next.role === 'employee' ? next.role : prev.role,
            }
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id])

  const signInWithPassword = useCallback(
    async ({ login, password }: { login: string; password: string }) => {
      const normalizedLogin = login.trim().toLowerCase()
      if (!/^[a-z0-9]+$/.test(normalizedLogin)) {
        throw new Error('Логин: только латинские буквы и цифры')
      }
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, login, role, is_hidden')
        .eq('login', normalizedLogin)
        .eq('password', password)
        .maybeSingle()
      if (error) throw error
      if (!data) throw new Error('Неверный логин или пароль')
      const row = data as Employee
      if (row.is_hidden) {
        localStorage.setItem(LS_AUTH_REVOKED, ACCESS_REVOKED_TEXT)
        throw new Error(ACCESS_REVOKED_TEXT)
      }
      localStorage.setItem(LS_AUTH_USER_ID, row.id)
      localStorage.removeItem(LS_AUTH_REVOKED)
      setUser({
        id: row.id,
        name: row.name,
        login: row.login ?? normalizedLogin,
        role: row.role ?? 'employee',
      })
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session: user ? { userId: user.id } : null,
      user,
      signInWithPassword,
      signOut,
    }),
    [isLoading, user, signInWithPassword, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


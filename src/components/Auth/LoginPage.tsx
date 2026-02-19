import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function LoginPage() {
  const { signInWithPassword } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)

  const isValid = useMemo(
    () => email.trim().length > 3 && password.length >= 6,
    [email, password],
  )

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid || isSubmitting) return
    setIsSubmitting(true)
    setErrorText(null)
    try {
      await signInWithPassword({ email: email.trim(), password })
      navigate('/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка входа'
      setErrorText(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-full bg-black text-white">
      <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-12">
        <div className="rounded-2xl p-8">
          <div className="text-sm text-white/60">Task tracker</div>
          <h1 className="mt-2 text-2xl tracking-tight">Вход</h1>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <div className="text-sm text-white/70">Email</div>
              <input
                className="mt-1 w-full rounded-xl px-3 py-2 text-white outline-none"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
              />
            </label>

            <label className="block">
              <div className="text-sm text-white/70">Пароль</div>
              <input
                className="mt-1 w-full rounded-xl px-3 py-2 text-white outline-none"
                autoComplete="current-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            {errorText ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {errorText}
              </div>
            ) : null}

            <button
              className="w-full rounded-xl bg-white px-3 py-2 text-sm text-black disabled:opacity-40"
              type="submit"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Входим…' : 'Войти'}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-white/40">
          Доступ только для сотрудников с созданным аккаунтом Supabase.
        </div>
      </div>
    </div>
  )
}


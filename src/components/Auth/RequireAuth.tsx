import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function RequireAuth() {
  const { isLoading, session } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-full bg-black text-white">
        <div className="mx-auto max-w-md px-6 py-10 text-white/70">
          Загрузка…
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}


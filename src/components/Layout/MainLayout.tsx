import { Outlet } from 'react-router-dom'
import { AppProvider } from '../../contexts/AppContext'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  return (
    <AppProvider>
      <div className="flex h-full min-h-full bg-black text-white">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </AppProvider>
  )
}


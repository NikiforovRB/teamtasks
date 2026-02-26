import { Outlet } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { AppProvider } from '../../contexts/AppContext'
import { Sidebar } from './Sidebar'

export function MainLayout() {
  return (
    <AppProvider>
      <div className="flex h-full min-h-full bg-black text-white">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full text-white/80 hover:text-white"
          style={{ backgroundColor: '#232323' }}
          aria-label="Обновить страницу"
          title="Обновить страницу"
        >
          <RefreshCw size={18} />
        </button>
      </div>
    </AppProvider>
  )
}


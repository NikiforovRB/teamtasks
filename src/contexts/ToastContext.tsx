import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
}

type ToastContextValue = {
  addToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-lg ${
              t.type === 'error' ? 'border-red-500/40 bg-red-500/20 text-red-100' : ''
            } ${
              t.type === 'success' ? 'border-green-500/40 bg-green-500/20 text-green-100' : ''
            } ${t.type === 'info' ? 'border-white/20 bg-black/80 text-white' : ''}`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="rounded px-1 text-white/60 hover:text-white"
              aria-label="Закрыть"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) return { addToast: () => {} }
  return ctx
}

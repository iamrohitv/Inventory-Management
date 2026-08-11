import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(null)

const STYLES = {
  success: { bar: 'bg-emerald-500', icon: 'M5 13l4 4L19 7', chip: 'bg-emerald-500' },
  error: { bar: 'bg-red-500', icon: 'M6 18L18 6M6 6l12 12', chip: 'bg-red-500' },
  warning: { bar: 'bg-amber-500', icon: 'M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', chip: 'bg-amber-500' },
  info: { bar: 'bg-indigo-500', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', chip: 'bg-indigo-500' },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, type = 'info') => {
    const id = ++idRef.current
    setToasts((list) => [...list, { id, message, type }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const toast = {
    success: (m) => push(m, 'success'),
    error: (m) => push(m, 'error'),
    warning: (m) => push(m, 'warning'),
    info: (m) => push(m, 'info'),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const s = STYLES[t.type]
          return (
            <div key={t.id} className="animate-slide-in relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white pl-4 pr-5 py-3 shadow-lift dark:border-slate-700 dark:bg-slate-900 max-w-sm">
              <span className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${s.bar}`} />
              <span className={`h-8 w-8 shrink-0 rounded-lg ${s.chip} flex items-center justify-center`}>
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={s.icon} />
                </svg>
              </span>
              <span className="flex-1 text-sm font-medium text-slate-800 dark:text-slate-100">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

// ============================================================
// Camp Biblique-Navs 2026 — Système de notifications (Phase 4, Étape D)
// Pur Tailwind, sans dépendance externe, pour rester cohérent avec la
// palette "Greenery" du projet et limiter la surface de maintenance.
// ============================================================

type TypeToast = 'succes' | 'erreur'

interface ToastItem {
  id: number
  message: string
  type: TypeToast
}

interface ToastContextValue {
  succes: (message: string) => void
  erreur: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let prochainId = 1

function ToastBulle({ message, type }: { message: string; type: TypeToast }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const delai = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(delai)
  }, [])

  return (
    <div
      role="status"
      className={`pointer-events-auto max-w-sm w-full sm:w-auto rounded-xl shadow-lg px-4 py-3 text-sm font-medium text-white transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${type === 'succes' ? 'bg-[#4F8A3D]' : 'bg-[#B3492F]'}`}
    >
      {message}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const ajouter = useCallback((message: string, type: TypeToast) => {
    const id = prochainId++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const valeur: ToastContextValue = {
    succes: message => ajouter(message, 'succes'),
    erreur: message => ajouter(message, 'erreur'),
  }

  return (
    <ToastContext.Provider value={valeur}>
      {children}
      <div className="fixed bottom-4 inset-x-0 sm:bottom-6 sm:right-6 sm:inset-x-auto z-50 flex flex-col items-center sm:items-end gap-2 px-4 pointer-events-none">
        {toasts.map(t => (
          <ToastBulle key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error("useToast doit être utilisé à l'intérieur de <ToastProvider>")
  }
  return ctx
}

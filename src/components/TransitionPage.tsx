import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

// ============================================================
// Petite transition de page en CSS pur (Tailwind core uniquement,
// pas de librairie d'animation) — évite l'effet de coupure brute
// entre deux écrans lors de la navigation.
// ============================================================

export default function TransitionPage({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(false)
    const delai = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(delai)
  }, [location.pathname])

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
    >
      {children}
    </div>
  )
}

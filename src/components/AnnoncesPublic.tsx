import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Affichage public des annonces
// Lecture libre (sans connexion) — RLS "annonces_select_public" (Phase 2)
// ============================================================

type Priorite = 'high' | 'medium' | 'low'

interface Annonce {
  id: string
  titre: string
  contenu: string
  priorite: Priorite
  date_publication: string
}

const POIDS_PRIORITE: Record<Priorite, number> = { high: 0, medium: 1, low: 2 }

function styleBordure(priorite: Priorite) {
  if (priorite === 'high') return 'border-l-4 border-[#B3492F]'
  if (priorite === 'medium') return 'border-l-4 border-[#D9A441]'
  return 'border-l-4 border-[#9CC18F]'
}

export default function AnnoncesPublic() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from('annonces')
        .select('*')
        .order('date_publication', { ascending: false })
        .limit(5)

      if (!error && data) {
        const triees = [...(data as Annonce[])].sort(
          (a, b) => POIDS_PRIORITE[a.priorite] - POIDS_PRIORITE[b.priorite]
        )
        setAnnonces(triees)
      }
      setChargement(false)
    }
    charger()
  }, [])

  if (chargement || annonces.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-2 mb-6">
      {annonces.map(a => (
        <div key={a.id} className={`bg-white rounded-xl shadow-sm p-4 ${styleBordure(a.priorite)}`}>
          <p className="font-semibold text-[#1B3B1A] text-sm">{a.titre}</p>
          <p className="text-sm text-gray-600 mt-0.5">{a.contenu}</p>
        </div>
      ))}
    </div>
  )
}

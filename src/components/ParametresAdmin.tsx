import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Paramètres du camp (Phase 4, Étape A)
// Permet de modifier l'objectif budgétaire et les quotas de places
// directement depuis l'application, sans passer par le SQL Editor.
// ============================================================

const ROLES_ADMIN = ['admin'] as const

interface Parametre {
  cle: string
  valeur: number
}

const LIBELLES: Record<string, string> = {
  budget_global: 'Objectif budgétaire global (F CFA)',
  places_16_plus: 'Places disponibles — 16 ans et plus',
  places_15_moins: 'Places disponibles — 15 ans et moins',
}

export default function ParametresAdmin() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const [parametres, setParametres] = useState<Parametre[]>([])
  const [valeurs, setValeurs] = useState<Record<string, string>>({})
  const [messageParCle, setMessageParCle] = useState<Record<string, string>>({})

  async function charger() {
    const { data, error } = await supabase.from('parametres_camp').select('*').order('cle')
    if (!error && data) {
      const lignes = data as Parametre[]
      setParametres(lignes)
      const init: Record<string, string> = {}
      lignes.forEach(p => { init[p.cle] = String(p.valeur) })
      setValeurs(init)
    }
  }

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces])

  async function enregistrer(cle: string) {
    const valeur = Number(valeurs[cle])
    if (!Number.isFinite(valeur)) return

    const { error } = await supabase.from('parametres_camp').update({ valeur }).eq('cle', cle)
    setMessageParCle(prev => ({ ...prev, [cle]: error ? 'Erreur lors de l\'enregistrement' : 'Enregistré ✓' }))
    setTimeout(() => setMessageParCle(prev => ({ ...prev, [cle]: '' })), 2500)
  }

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }
  if (statutAcces === 'non_connecte') return <Login onConnecte={verifierAcces} />
  if (statutAcces === 'refuse') {
    return <AccesRestreint message="Ce module est réservé à l'administration du camp." />
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Paramètres du camp</h1>

        {parametres.length === 0 ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (
          parametres.map(p => (
            <div key={p.cle} className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
              <label className="block text-sm font-medium text-[#1B3B1A] mb-2">
                {LIBELLES[p.cle] ?? p.cle}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={valeurs[p.cle] ?? ''}
                  onChange={e => setValeurs(prev => ({ ...prev, [p.cle]: e.target.value }))}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => enregistrer(p.cle)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]"
                >
                  Enregistrer
                </button>
              </div>
              {messageParCle[p.cle] && (
                <p className="text-xs text-[#4F8A3D] mt-2">{messageParCle[p.cle]}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

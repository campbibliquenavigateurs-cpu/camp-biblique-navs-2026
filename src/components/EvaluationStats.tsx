import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Synthèse des évaluations (Phase 3, Étape 5)
// Réservé au rôle : admin
// Agrégation calculée côté client (RLS "evaluations" déjà admin-only,
// volume de réponses attendu modeste à l'échelle d'un camp).
// ============================================================

const ROLES_ADMIN = ['admin'] as const

type Critere = 'enseignements' | 'logistique' | 'restauration' | 'ambiance'

const CRITERES: { cle: Critere; colonne: string; label: string }[] = [
  { cle: 'enseignements', colonne: 'note_enseignements', label: 'Enseignements / Ateliers' },
  { cle: 'logistique', colonne: 'note_logistique', label: 'Logistique / Logement' },
  { cle: 'restauration', colonne: 'note_restauration', label: 'Restauration' },
  { cle: 'ambiance', colonne: 'note_ambiance', label: 'Ambiance générale' },
]

interface LigneEvaluation {
  note_enseignements: number | null
  note_logistique: number | null
  note_restauration: number | null
  note_ambiance: number | null
  commentaire: string | null
}

export default function EvaluationStats() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const [lignes, setLignes] = useState<LigneEvaluation[]>([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase
      .from('evaluations')
      .select('note_enseignements, note_logistique, note_restauration, note_ambiance, commentaire')
    if (!error && data) setLignes(data as LigneEvaluation[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  function moyenne(colonne: keyof LigneEvaluation): number {
    const valeurs = lignes.map(l => l[colonne]).filter((v): v is number => typeof v === 'number')
    if (valeurs.length === 0) return 0
    return valeurs.reduce((acc, v) => acc + v, 0) / valeurs.length
  }

  const suggestions = lignes.map(l => l.commentaire).filter((c): c is string => !!c && c.trim() !== '')

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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Synthèse des évaluations</h1>
          <p className="text-sm text-gray-400 mt-1">
            {chargement ? 'Chargement...' : `${lignes.length} réponse${lignes.length > 1 ? 's' : ''} reçue${lignes.length > 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 space-y-5">
          {CRITERES.map(critere => {
            const moy = moyenne(critere.colonne as keyof LigneEvaluation)
            const pourcentage = (moy / 5) * 100
            return (
              <div key={critere.cle}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[#1B3B1A]">{critere.label}</span>
                  <span className="text-sm font-bold text-[#1B3B1A]">{moy.toFixed(1)} / 5</span>
                </div>
                <div className="h-2.5 rounded-full bg-[#E7F2DE] overflow-hidden">
                  <div
                    className="h-full bg-[#D9A441] transition-all duration-500 ease-out"
                    style={{ width: `${pourcentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-3">
            Suggestions reçues {suggestions.length > 0 && `(${suggestions.length})`}
          </p>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune suggestion pour le moment.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {suggestions.map((s, i) => (
                <li key={i} className="text-sm text-gray-600 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

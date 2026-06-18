import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Modération des témoignages (Phase 3, Étape 5)
// Réservé au rôle : admin
// ============================================================

const ROLES_ADMIN = ['admin'] as const

interface Temoignage {
  id: string
  auteur_nom: string | null
  contenu: string
  approuve: boolean
  created_at: string
}

export default function AdminTemoignages() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const [enAttente, setEnAttente] = useState<Temoignage[]>([])
  const [publies, setPublies] = useState<Temoignage[]>([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase
      .from('temoignages')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const tous = data as Temoignage[]
      setEnAttente(tous.filter(t => !t.approuve))
      setPublies(tous.filter(t => t.approuve))
    }
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  async function approuver(id: string) {
    setEnAttente(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('temoignages').update({ approuve: true }).eq('id', id)
    if (!error) charger()
  }

  async function rejeter(id: string) {
    setEnAttente(prev => prev.filter(t => t.id !== id))
    await supabase.from('temoignages').delete().eq('id', id)
  }

  async function retirerDeLaPublication(id: string) {
    setPublies(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('temoignages').update({ approuve: false }).eq('id', id)
    if (!error) charger()
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
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Modération des témoignages</h1>

        <div>
          <p className="text-sm font-semibold text-[#1B3B1A] mb-3">
            En attente {enAttente.length > 0 && `(${enAttente.length})`}
          </p>
          {chargement ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : enAttente.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun témoignage en attente de validation.</p>
          ) : (
            <div className="space-y-3">
              {enAttente.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-[#D9A441] shadow-sm p-4">
                  <p className="text-sm text-gray-700">{t.contenu}</p>
                  <p className="text-xs text-gray-400 mt-2 mb-3">— {t.auteur_nom || 'Anonyme'}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => approuver(t.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]"
                    >
                      Approuver
                    </button>
                    <button
                      type="button"
                      onClick={() => rejeter(t.id)}
                      className="px-4 py-1.5 rounded-lg text-xs font-semibold text-[#B3492F] border border-[#B3492F] hover:bg-[#B3492F]/10"
                    >
                      Rejeter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-[#1B3B1A] mb-3">Publiés ({publies.length})</p>
          {publies.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun témoignage publié pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {publies.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-700">{t.contenu}</p>
                    <p className="text-xs text-gray-400 mt-2">— {t.auteur_nom || 'Anonyme'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => retirerDeLaPublication(t.id)}
                    className="text-xs text-gray-400 hover:text-[#B3492F] shrink-0"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

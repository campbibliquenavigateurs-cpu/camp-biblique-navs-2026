import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Affichage public des chants
// Lecture libre (sans connexion) — RLS "chants_select_public" (Phase 2)
// ============================================================

interface Chant {
  id: string
  titre: string
  auteur: string | null
  lien_audio: string | null
  paroles: string | null
}

export default function ChantsPublic() {
  const [chants, setChants] = useState<Chant[]>([])
  const [chargement, setChargement] = useState(true)
  const [ouverts, setOuverts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase.from('chants').select('*').order('titre', { ascending: true })
      if (!error && data) setChants(data as Chant[])
      setChargement(false)
    }
    charger()
  }, [])

  function basculer(id: string) {
    setOuverts(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Louange &amp; Chants</h1>

        {chargement ? (
          <p className="text-center text-sm text-gray-400 py-8">Chargement...</p>
        ) : chants.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucun chant disponible pour le moment.</p>
        ) : (
          chants.map(chant => (
            <div key={chant.id} className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => basculer(chant.id)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-semibold text-[#1B3B1A]">{chant.titre}</p>
                  {chant.auteur && <p className="text-xs text-gray-400">{chant.auteur}</p>}
                </div>
                <span className="text-[#4F8A3D] text-sm">{ouverts[chant.id] ? '−' : '+'}</span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  ouverts[chant.id] ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-4 pb-4 space-y-3">
                  {chant.lien_audio && (
                    <a
                      href={chant.lien_audio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#4F8A3D] hover:underline"
                    >
                      ▶ Écouter le morceau
                    </a>
                  )}
                  {chant.paroles ? (
                    <p className="text-sm text-gray-600 whitespace-pre-line">{chant.paroles}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Paroles non disponibles.</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

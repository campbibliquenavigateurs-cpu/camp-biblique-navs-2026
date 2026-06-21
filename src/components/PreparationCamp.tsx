import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Backpack, Bus, Heart, Check, ScrollText } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Comment se préparer (Phase 14)
// Checklist et règlement désormais chargés depuis la base de
// données (gérés depuis l'Espace Comité), plus en dur dans le code.
// ============================================================

const STYLES = `
  @keyframes apparitionDouce {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .apparition { opacity: 0; animation: apparitionDouce 0.5s ease-out forwards; }
`

const CLE_STOCKAGE = 'camp-navs-2026-checklist'

interface ItemContenu {
  id: string
  section: 'checklist' | 'reglement'
  libelle: string
  ordre: number
}

function chargerCoches(): Record<string, boolean> {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    return brut ? JSON.parse(brut) : {}
  } catch {
    return {}
  }
}

export default function PreparationCamp() {
  const [items, setItems] = useState<ItemContenu[]>([])
  const [chargement, setChargement] = useState(true)
  const [coches, setCoches] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCoches(chargerCoches())
    async function charger() {
      const { data, error } = await supabase.from('contenu_preparation').select('*').order('ordre')
      if (!error && data) setItems(data as ItemContenu[])
      setChargement(false)
    }
    charger()
  }, [])

  function basculer(id: string) {
    setCoches(prev => {
      const suivant = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(suivant)) } catch { /* sans incidence */ }
      return suivant
    })
  }

  const checklist = items.filter(i => i.section === 'checklist')
  const reglement = items.filter(i => i.section === 'reglement')
  const nbCoches = checklist.filter(a => coches[a.id]).length

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-xl mx-auto">
        <h1 className="apparition text-2xl font-bold text-[#1B3B1A] mb-1 text-center" style={{ animationDelay: '0ms' }}>
          Comment se préparer pour le camp
        </h1>
        <p className="apparition text-sm text-gray-500 text-center mb-6" style={{ animationDelay: '50ms' }}>
          Camp Biblique-Navs 2026 · 23 – 29 août 2026
        </p>

        {chargement ? (
          <p className="text-center text-sm text-gray-400">Chargement...</p>
        ) : (
          <>
            {/* Checklist interactive */}
            {checklist.length > 0 && (
              <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 mb-5" style={{ animationDelay: '100ms' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Backpack className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.7} />
                    <p className="text-sm font-bold text-[#1B3B1A]">Checklist de votre sac</p>
                  </div>
                  <span className="text-xs text-gray-400">{nbCoches} / {checklist.length}</span>
                </div>
                <div className="space-y-1.5">
                  {checklist.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => basculer(a.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F4F9F0] transition-colors duration-150 text-left"
                    >
                      <span
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors duration-200 ${
                          coches[a.id] ? 'bg-[#4F8A3D] border-[#4F8A3D]' : 'border-gray-300'
                        }`}
                      >
                        {coches[a.id] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                      </span>
                      <span className={`text-sm ${coches[a.id] ? 'text-gray-400 line-through' : 'text-[#1B3B1A]'}`}>
                        {a.libelle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Règlement du camp — liste simple, sans case à cocher */}
            {reglement.length > 0 && (
              <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 mb-5" style={{ animationDelay: '150ms' }}>
                <div className="flex items-center gap-2 mb-3">
                  <ScrollText className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.7} />
                  <p className="text-sm font-bold text-[#1B3B1A]">Règlement du camp</p>
                </div>
                <ul className="space-y-2">
                  {reglement.map(r => (
                    <li key={r.id} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-[#4F8A3D] mt-0.5">•</span>
                      <span>{r.libelle}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Carte Logistique */}
            <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 mb-4" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center gap-2 mb-2">
                <Bus className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.7} />
                <p className="text-sm font-bold text-[#1B3B1A]">Logistique — Départ &amp; Convoi</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Le lieu et l'heure de rendez-vous pour le départ vous seront communiqués par l'équipe d'organisation
                avant le camp. Pensez à arriver à l'heure indiquée pour le convoi.
              </p>
            </div>

            {/* Carte Préparation spirituelle */}
            <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5" style={{ animationDelay: '250ms' }}>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.7} />
                <p className="text-sm font-bold text-[#1B3B1A]">Préparation spirituelle</p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Prenez un temps de prière et de méditation sur le thème du camp avant votre arrivée :
                « Les familles et les réseaux relationnels pour former des disciples » (Jean 1 : 40-42).
              </p>
            </div>
          </>
        )}

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-[#5B7A56] hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

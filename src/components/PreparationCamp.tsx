import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Backpack, Bus, Heart, Check } from 'lucide-react'

// ============================================================
// Camp Biblique-Navs 2026 — Comment se préparer (Phase 13)
// Checklist interactive (persistée localement sur l'appareil),
// cartes informatives, apparition en fondu au chargement.
// Le contenu reste indicatif : à ajuster par l'organisation.
// ============================================================

const STYLES = `
  @keyframes apparitionDouce {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .apparition { opacity: 0; animation: apparitionDouce 0.5s ease-out forwards; }
`

const CLE_STOCKAGE = 'camp-navs-2026-checklist'

interface ArticleChecklist {
  id: string
  libelle: string
}

const ARTICLES: ArticleChecklist[] = [
  { id: 'bible', libelle: 'Une Bible' },
  { id: 'cahier', libelle: 'Un cahier de notes et un stylo' },
  { id: 'vetements', libelle: 'Des vêtements pour la durée du camp' },
  { id: 'sport', libelle: 'Une tenue de sport' },
  { id: 'toilette', libelle: 'Trousse de toilette' },
  { id: 'lampe', libelle: 'Une lampe de poche' },
  { id: 'gourde', libelle: "Une gourde ou bouteille d'eau" },
  { id: 'medicaments', libelle: 'Médicaments personnels (si besoin)' },
  { id: 'identite', libelle: "Une pièce d'identité" },
]

function chargerCoches(): Record<string, boolean> {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE)
    return brut ? JSON.parse(brut) : {}
  } catch {
    return {}
  }
}

export default function PreparationCamp() {
  const [coches, setCoches] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCoches(chargerCoches())
  }, [])

  function basculer(id: string) {
    setCoches(prev => {
      const suivant = { ...prev, [id]: !prev[id] }
      try { localStorage.setItem(CLE_STOCKAGE, JSON.stringify(suivant)) } catch { /* stockage indisponible, sans incidence */ }
      return suivant
    })
  }

  const nbCoches = ARTICLES.filter(a => coches[a.id]).length

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

        {/* Checklist interactive */}
        <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 mb-5" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Backpack className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.7} />
              <p className="text-sm font-bold text-[#1B3B1A]">Checklist de votre sac</p>
            </div>
            <span className="text-xs text-gray-400">{nbCoches} / {ARTICLES.length}</span>
          </div>
          <div className="space-y-1.5">
            {ARTICLES.map(a => (
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
          <p className="text-xs text-gray-400 mt-3 italic">Liste indicative — sera complétée par l'équipe d'organisation.</p>
        </div>

        {/* Carte Logistique */}
        <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 mb-4" style={{ animationDelay: '150ms' }}>
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
        <div className="apparition bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.7} />
            <p className="text-sm font-bold text-[#1B3B1A]">Préparation spirituelle</p>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Prenez un temps de prière et de méditation sur le thème du camp avant votre arrivée :
            « Les familles et les réseaux relationnels pour former des disciples » (Jean 1 : 40-42).
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-[#5B7A56] hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

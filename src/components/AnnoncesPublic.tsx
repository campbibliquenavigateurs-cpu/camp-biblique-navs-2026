import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Annonces & Flash Infos (édition Premium)
// Cartes entièrement cliquables, dépliage animé en CSS pur (technique
// grid-template-rows, sans JS de mesure de hauteur), entrée en
// cascade, micro-interaction au survol/toucher.
// ============================================================

const STYLES = `
  @keyframes annonceEntree {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .annonce-carte {
    opacity: 0;
    animation: annonceEntree 0.45s ease-out forwards;
  }
  .annonce-pliable {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 300ms ease;
    overflow: hidden;
  }
  .annonce-pliable.ouverte {
    grid-template-rows: 1fr;
  }
  .annonce-pliable > div {
    min-height: 0;
  }
`

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

// La base ne distingue que 3 niveaux de priorité (high/medium/low) — pas
// de catégories thématiques séparées (Logistique, etc.). On mappe donc
// ces 3 niveaux à des badges clairs plutôt que d'inventer une donnée
// qui n'existe pas dans le schéma.
function badgePriorite(priorite: Priorite) {
  if (priorite === 'high') return { label: 'Urgent', bg: 'bg-[#B3492F]/10', text: 'text-[#B3492F]' }
  if (priorite === 'medium') return { label: 'Rappel', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'Info', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
}

function tempsRelatif(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diffMs / 60000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `Il y a ${heures} h`
  const jours = Math.floor(heures / 24)
  if (jours < 7) return `Il y a ${jours} j`
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function ChevronBas({ ouverte }: { ouverte: boolean }) {
  return (
    <svg
      className={`w-3.5 h-3.5 transition-transform duration-200 ${ouverte ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

function CarteAnnonce({ annonce, index }: { annonce: Annonce; index: number }) {
  const [ouverte, setOuverte] = useState(false)
  const badge = badgePriorite(annonce.priorite)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOuverte(v => !v)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOuverte(v => !v)}
      className={`annonce-carte bg-white rounded-xl shadow-sm p-4 cursor-pointer select-none
        transition-all duration-200 hover:scale-[1.015] hover:shadow-md active:scale-[1.015]
        ${styleBordure(annonce.priorite)}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
        <span className="text-[11px] text-gray-400 shrink-0">{tempsRelatif(annonce.date_publication)}</span>
      </div>

      <p className="font-semibold text-[#1B3B1A] text-sm">{annonce.titre}</p>

      {!ouverte && (
        <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{annonce.contenu}</p>
      )}

      <div className={`annonce-pliable ${ouverte ? 'ouverte' : ''}`}>
        <div>
          <p className="text-sm text-gray-600 mt-0.5 pt-0.5">{annonce.contenu}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-2 text-xs font-medium text-[#4F8A3D]">
        {ouverte ? 'Réduire' : 'Lire la suite'}
        <ChevronBas ouverte={ouverte} />
      </div>
    </div>
  )
}

function EtatVide() {
  return (
    <div className="annonce-carte text-center py-12" style={{ animationDelay: '0ms' }}>
      <svg className="w-10 h-10 text-[#9CC18F] mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
      </svg>
      <p className="text-sm text-gray-400">Aucune annonce pour le moment.</p>
    </div>
  )
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

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-6 text-center">Annonces &amp; Flash Infos</h1>

        {chargement ? (
          <p className="text-center text-sm text-gray-400">Chargement...</p>
        ) : annonces.length === 0 ? (
          <EtatVide />
        ) : (
          <div className="space-y-2.5">
            {annonces.map((a, index) => (
              <CarteAnnonce key={a.id} annonce={a} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, Info, type LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SkeletonCarteAnnonce } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Annonces & Flash Infos (édition Premium v2)
// Plus de bordure colorée : teinte de fond dégradée à la place.
// Regroupement par période, mise en avant de l'annonce urgente la
// plus récente, icônes de priorité, hiérarchie typographique renforcée.
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

interface StylePriorite {
  label: string
  Icon: LucideIcon
  texte: string
  fondBadge: string
  degrade: string
}

function stylePriorite(priorite: Priorite): StylePriorite {
  if (priorite === 'high') {
    return { label: 'Urgent', Icon: AlertTriangle, texte: 'text-[#B3492F]', fondBadge: 'bg-[#B3492F]/10', degrade: 'bg-gradient-to-r from-[#B3492F]/[0.07] via-white to-white' }
  }
  if (priorite === 'medium') {
    return { label: 'Rappel', Icon: Bell, texte: 'text-[#8A6A23]', fondBadge: 'bg-[#D9A441]/15', degrade: 'bg-gradient-to-r from-[#D9A441]/[0.09] via-white to-white' }
  }
  return { label: 'Info', Icon: Info, texte: 'text-[#4F8A3D]', fondBadge: 'bg-[#E7F2DE]', degrade: 'bg-gradient-to-r from-[#9CC18F]/[0.10] via-white to-white' }
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

// Regroupe les annonces (déjà triées) en 3 paniers temporels, pour une
// lecture façon fil d'actualité plutôt qu'une liste plate uniforme.
function regrouperParPeriode(annonces: Annonce[]) {
  const maintenant = new Date()
  const aujourdHui: Annonce[] = []
  const cetteSemaine: Annonce[] = []
  const plusAncien: Annonce[] = []
  annonces.forEach(a => {
    const date = new Date(a.date_publication)
    const diffJours = (maintenant.getTime() - date.getTime()) / 86400000
    if (date.toDateString() === maintenant.toDateString()) aujourdHui.push(a)
    else if (diffJours < 7) cetteSemaine.push(a)
    else plusAncien.push(a)
  })
  return { aujourdHui, cetteSemaine, plusAncien }
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

function CarteAnnonce({ annonce, index, vedette = false }: { annonce: Annonce; index: number; vedette?: boolean }) {
  const [ouverte, setOuverte] = useState(false)
  const style = stylePriorite(annonce.priorite)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOuverte(v => !v)}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setOuverte(v => !v)}
      className={`annonce-carte relative rounded-xl shadow-sm cursor-pointer select-none overflow-hidden
        transition-all duration-200 hover:scale-[1.015] hover:shadow-md active:scale-[1.015]
        ${style.degrade} ${vedette ? 'p-6 ring-1 ring-[#B3492F]/20' : 'p-5'}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {vedette && <div className="absolute top-0 inset-x-0 h-1 bg-[#B3492F]" />}

      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${style.fondBadge} ${style.texte}`}>
          <style.Icon className="w-3 h-3" strokeWidth={2} />
          {style.label}
        </span>
        <span className="text-[11px] text-gray-400 tracking-wide shrink-0">{tempsRelatif(annonce.date_publication)}</span>
      </div>

      <p className={`font-bold text-[#1B3B1A] ${vedette ? 'text-lg' : 'text-base'}`}>{annonce.titre}</p>

      {!ouverte && (
        <p className={`text-gray-600 mt-1 leading-relaxed line-clamp-2 ${vedette ? 'text-sm' : 'text-sm'}`}>{annonce.contenu}</p>
      )}

      <div className={`annonce-pliable ${ouverte ? 'ouverte' : ''}`}>
        <div>
          <p className="text-sm text-gray-600 mt-1 pt-0.5 leading-relaxed">{annonce.contenu}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#4F8A3D]">
        {ouverte ? 'Réduire' : 'Lire la suite'}
        <ChevronBas ouverte={ouverte} />
      </div>
    </div>
  )
}

function EnteteGroupe({ titre }: { titre: string }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest text-[#5B7A56] mt-6 mb-2.5 first:mt-0">
      {titre}
    </p>
  )
}

function EtatVide() {
  return (
    <div className="annonce-carte text-center py-12">
      <Info className="w-10 h-10 text-[#9CC18F] mx-auto mb-3" strokeWidth={1.5} />
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

  // La toute première annonce, si elle est "Urgent", est mise en avant
  // au-dessus du fil, plutôt que noyée dans la liste comme les autres.
  const vedette = annonces[0]?.priorite === 'high' ? annonces[0] : null
  const reste = vedette ? annonces.filter(a => a.id !== vedette.id) : annonces
  const { aujourdHui, cetteSemaine, plusAncien } = regrouperParPeriode(reste)

  let compteur = 0
  function prochainIndex() {
    compteur += 1
    return compteur
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-6 text-center">Annonces &amp; Flash Infos</h1>

        {chargement ? (
          <div className="space-y-3">
            <SkeletonCarteAnnonce />
            <SkeletonCarteAnnonce />
            <SkeletonCarteAnnonce />
          </div>
        ) : annonces.length === 0 ? (
          <EtatVide />
        ) : (
          <div>
            {vedette && (
              <div className="mb-5">
                <CarteAnnonce annonce={vedette} index={prochainIndex()} vedette />
              </div>
            )}

            {aujourdHui.length > 0 && (
              <>
                <EnteteGroupe titre="Aujourd'hui" />
                <div className="space-y-3">
                  {aujourdHui.map(a => <CarteAnnonce key={a.id} annonce={a} index={prochainIndex()} />)}
                </div>
              </>
            )}

            {cetteSemaine.length > 0 && (
              <>
                <EnteteGroupe titre="Cette semaine" />
                <div className="space-y-3">
                  {cetteSemaine.map(a => <CarteAnnonce key={a.id} annonce={a} index={prochainIndex()} />)}
                </div>
              </>
            )}

            {plusAncien.length > 0 && (
              <>
                <EnteteGroupe titre="Plus ancien" />
                <div className="space-y-3">
                  {plusAncien.map(a => <CarteAnnonce key={a.id} annonce={a} index={prochainIndex()} />)}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

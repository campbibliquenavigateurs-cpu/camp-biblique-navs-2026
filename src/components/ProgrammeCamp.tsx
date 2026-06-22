import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { JOURS_CAMP, iconeDeCategorie, estEnCours, jourActifParDefaut } from './programmeConstantes'
import { SkeletonTimelineProgramme } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Programme du Camp (Phase 23)
// Timeline verticale par jour (onglets horizontaux), icônes Lucide
// strictement mappées par catégorie, accordéon pour les ateliers
// simultanés, repère "En ce moment" basé sur l'heure réelle.
// Aucun emoji n'est utilisé nulle part dans ce composant.
// ============================================================

interface Creneau {
  id: string
  jour: string
  heure_debut: string
  heure_fin: string
  categorie: string
  titre: string
  orateur: string | null
  versets: string | null
}
interface OptionAtelier { id: string; programme_id: string; titre: string; orateur: string | null }
interface JourInfo { jour: string; message_alerte: string | null }

function CarteAtelier({ creneau, options, enCours }: { creneau: Creneau; options: OptionAtelier[]; enCours: boolean }) {
  const [ouvert, setOuvert] = useState(false)
  const Icone = iconeDeCategorie(creneau.categorie)

  return (
    <div className={`bg-white rounded-xl shadow-sm transition-shadow duration-300 ${enCours ? 'ring-2 ring-[#D9A441] shadow-[0_0_16px_rgba(217,164,65,0.35)]' : ''}`}>
      <button type="button" onClick={() => setOuvert(v => !v)} className="w-full flex items-center gap-3 p-4 text-left">
        <div className="w-10 h-10 rounded-full bg-[#E7F2DE] flex items-center justify-center shrink-0">
          <Icone className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.8} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-gray-400">{creneau.heure_debut.slice(0, 5)} – {creneau.heure_fin.slice(0, 5)}</p>
          <p className="text-sm font-semibold text-[#1B3B1A]">{creneau.titre}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${ouvert ? 'rotate-180' : ''}`} strokeWidth={2} />
      </button>
      {ouvert && (
        <div className="px-4 pb-4 pl-[4.25rem] space-y-2">
          {options.length === 0 ? (
            <p className="text-xs text-gray-400">Aucun atelier renseigné.</p>
          ) : options.map(o => (
            <div key={o.id} className="bg-[#F4F9F0] rounded-lg px-3 py-2">
              <p className="text-sm text-[#1B3B1A] font-medium">{o.titre}</p>
              {o.orateur && <p className="text-xs text-gray-500">{o.orateur}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CarteCreneau({ creneau, enCours }: { creneau: Creneau; enCours: boolean }) {
  const Icone = iconeDeCategorie(creneau.categorie)
  return (
    <div className={`bg-white rounded-xl shadow-sm p-4 flex items-start gap-3 transition-shadow duration-300 ${enCours ? 'ring-2 ring-[#D9A441] shadow-[0_0_16px_rgba(217,164,65,0.35)]' : ''}`}>
      <div className="w-10 h-10 rounded-full bg-[#E7F2DE] flex items-center justify-center shrink-0">
        <Icone className="w-5 h-5 text-[#4F8A3D]" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{creneau.heure_debut.slice(0, 5)} – {creneau.heure_fin.slice(0, 5)}</p>
        <p className="text-sm font-semibold text-[#1B3B1A]">{creneau.titre}</p>
        {creneau.orateur && <p className="text-xs text-gray-500 mt-0.5">{creneau.orateur}</p>}
        {creneau.versets && <p className="text-xs text-[#5B7A56] italic mt-0.5">{creneau.versets}</p>}
      </div>
    </div>
  )
}

export default function ProgrammeCamp() {
  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [options, setOptions] = useState<OptionAtelier[]>([])
  const [joursInfo, setJoursInfo] = useState<JourInfo[]>([])
  const [chargement, setChargement] = useState(true)
  const [jourActif, setJourActif] = useState(jourActifParDefaut())
  const [, setHorloge] = useState(Date.now())

  useEffect(() => {
    async function charger() {
      const [resCreneaux, resOptions, resJours] = await Promise.all([
        supabase.from('programme_camp').select('*').order('heure_debut'),
        supabase.from('programme_options').select('*').order('ordre'),
        supabase.from('programme_jours').select('*'),
      ])
      if (resCreneaux.data) setCreneaux(resCreneaux.data as Creneau[])
      if (resOptions.data) setOptions(resOptions.data as OptionAtelier[])
      if (resJours.data) setJoursInfo(resJours.data as JourInfo[])
      setChargement(false)
    }
    charger()
    // Rafraîchit le repère "En ce moment" chaque minute, sans recharger les données.
    const minuteur = setInterval(() => setHorloge(Date.now()), 60000)
    return () => clearInterval(minuteur)
  }, [])

  const creneauxDuJour = useMemo(
    () => creneaux.filter(c => c.jour === jourActif),
    [creneaux, jourActif]
  )
  const messageAlerte = joursInfo.find(j => j.jour === jourActif)?.message_alerte ?? null

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-6 text-center">Programme du Camp</h1>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
          {JOURS_CAMP.map(j => (
            <button
              key={j.date}
              type="button"
              onClick={() => setJourActif(j.date)}
              className={`shrink-0 text-xs font-semibold px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors duration-200 ${
                jourActif === j.date ? 'bg-[#4F8A3D] text-white' : 'bg-white text-[#5B7A56] hover:bg-[#E7F2DE]'
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>

        {messageAlerte && (
          <div className="flex items-start gap-2.5 bg-[#D9A441]/10 border border-[#D9A441]/30 rounded-xl p-4 mb-4">
            <AlertTriangle className="w-4 h-4 text-[#8A6A23] mt-0.5 shrink-0" strokeWidth={1.8} />
            <p className="text-sm text-[#8A6A23]">{messageAlerte}</p>
          </div>
        )}

        {chargement ? (
          <SkeletonTimelineProgramme />
        ) : creneauxDuJour.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucun créneau renseigné pour cette journée.</p>
        ) : (
          <div className="space-y-3">
            {creneauxDuJour.map(c => {
              const enCours = estEnCours(c.jour, c.heure_debut, c.heure_fin)
              if (c.categorie === 'Ateliers simultanés') {
                return (
                  <CarteAtelier
                    key={c.id}
                    creneau={c}
                    options={options.filter(o => o.programme_id === c.id)}
                    enCours={enCours}
                  />
                )
              }
              return <CarteCreneau key={c.id} creneau={c} enCours={enCours} />
            })}
          </div>
        )}
      </div>
    </div>
  )
}

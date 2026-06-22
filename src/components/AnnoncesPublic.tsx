import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Circle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CATEGORIES_ANNONCE, iconeDeCategorieAnnonce } from './annoncesConstantes'
import { SkeletonCarteAnnonce } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Annonces & Notifications (Phase 24)
// Centre de communication synchronisé en temps réel (Supabase
// Realtime — première utilisation de ce mécanisme dans le projet).
// Bandeau d'urgence persistant, flux filtrable par catégorie,
// suivi lu/non-lu mémorisé sur l'appareil. Aucun emoji : uniquement
// des icônes Lucide.
// ============================================================

const CLE_LUES = 'camp-navs-2026-annonces-lues'

interface Commission { id: string; nom: string }
interface Annonce {
  id: string
  titre: string
  contenu: string
  priorite: 'low' | 'medium' | 'high'
  categorie: string
  commission_id: string | null
  date_expiration: string | null
  date_publication: string
}

function nonExpiree(a: Annonce): boolean {
  if (!a.date_expiration) return true
  return new Date(a.date_expiration) > new Date()
}

function chargerAnnoncesLues(): string[] {
  try {
    const brut = localStorage.getItem(CLE_LUES)
    return brut ? JSON.parse(brut) : []
  } catch {
    return []
  }
}

function CarteAnnonce({ annonce, nomCommission, lue, onLire }: {
  annonce: Annonce
  nomCommission: (id: string | null) => string | null
  lue: boolean
  onLire: (id: string) => void
}) {
  const Icone = iconeDeCategorieAnnonce(annonce.categorie)
  const commission = nomCommission(annonce.commission_id)

  return (
    <button
      type="button"
      onClick={() => !lue && onLire(annonce.id)}
      className="w-full text-left bg-white rounded-xl shadow-sm p-4 flex items-start gap-3 transition-shadow duration-200 hover:shadow-md"
    >
      {!lue && <Circle className="w-2 h-2 fill-[#4F8A3D] text-[#4F8A3D] mt-1.5 shrink-0" />}
      <div className="w-9 h-9 rounded-full bg-[#E7F2DE] flex items-center justify-center shrink-0">
        <Icone className="w-4.5 h-4.5 text-[#4F8A3D]" strokeWidth={1.8} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-[11px] text-gray-400">
            {new Date(annonce.date_publication).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            {commission && ` · ${commission}`}
          </span>
        </div>
        <p className="text-sm font-semibold text-[#1B3B1A]">{annonce.titre}</p>
        <p className="text-sm text-gray-600 mt-0.5">{annonce.contenu}</p>
      </div>
    </button>
  )
}

export default function AnnoncesPublic() {
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [chargement, setChargement] = useState(true)
  const [categorieFiltre, setCategorieFiltre] = useState('')
  const [luesLocalement, setLuesLocalement] = useState<string[]>([])

  async function charger() {
    const [resAnnonces, resCommissions] = await Promise.all([
      supabase.from('annonces').select('*').order('date_publication', { ascending: false }),
      supabase.from('commissions').select('id,nom'),
    ])
    if (resAnnonces.data) setAnnonces(resAnnonces.data as Annonce[])
    if (resCommissions.data) setCommissions(resCommissions.data as Commission[])
    setChargement(false)
  }

  useEffect(() => {
    setLuesLocalement(chargerAnnoncesLues())
    charger()

    // Connexion au flux Supabase Realtime : toute insertion, mise à
    // jour ou suppression recharge instantanément la liste affichée,
    // sans action de la part de la personne qui consulte la page.
    const canal = supabase
      .channel('annonces-public-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'annonces' }, () => {
        charger()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const nomCommission = useMemo(() => {
    const carte = new Map(commissions.map(c => [c.id, c.nom]))
    return (id: string | null) => (id ? carte.get(id) ?? null : null)
  }, [commissions])

  function marquerLue(id: string) {
    setLuesLocalement(prev => {
      const suivant = [...prev, id]
      try { localStorage.setItem(CLE_LUES, JSON.stringify(suivant)) } catch { /* sans incidence */ }
      return suivant
    })
  }

  const annoncesActives = useMemo(() => annonces.filter(nonExpiree), [annonces])
  const urgentes = useMemo(() => annoncesActives.filter(a => a.priorite === 'high'), [annoncesActives])
  const standards = useMemo(() => {
    const sansUrgentes = annoncesActives.filter(a => a.priorite !== 'high')
    if (categorieFiltre === '') return sansUrgentes
    return sansUrgentes.filter(a => a.categorie === categorieFiltre)
  }, [annoncesActives, categorieFiltre])

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-6 text-center">Annonces &amp; Notifications</h1>

        {/* Bandeau d'alerte critique — persistant tant qu'une annonce urgente est active */}
        {urgentes.length > 0 && (
          <div className="space-y-2 mb-5">
            {urgentes.map(a => (
              <div key={a.id} className="bg-[#B3492F] text-white rounded-xl p-4 flex items-start gap-3 shadow-md">
                <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" strokeWidth={1.8} />
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/80">Urgent</p>
                  <p className="text-sm font-semibold">{a.titre}</p>
                  <p className="text-sm text-white/90 mt-0.5">{a.contenu}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filtres par catégorie */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button type="button" onClick={() => setCategorieFiltre('')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 ${categorieFiltre === '' ? 'bg-[#4F8A3D] text-white' : 'bg-white text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
            Toutes
          </button>
          {CATEGORIES_ANNONCE.map(c => (
            <button key={c.nom} type="button" onClick={() => setCategorieFiltre(c.nom)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 ${categorieFiltre === c.nom ? 'bg-[#4F8A3D] text-white' : 'bg-white text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
              {c.nom}
            </button>
          ))}
        </div>

        {chargement ? (
          <div className="space-y-3">
            <SkeletonCarteAnnonce /><SkeletonCarteAnnonce /><SkeletonCarteAnnonce />
          </div>
        ) : standards.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucune annonce pour le moment.</p>
        ) : (
          <div className="space-y-3">
            {standards.map(a => (
              <CarteAnnonce
                key={a.id}
                annonce={a}
                nomCommission={nomCommission}
                lue={luesLocalement.includes(a.id)}
                onLire={marquerLue}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

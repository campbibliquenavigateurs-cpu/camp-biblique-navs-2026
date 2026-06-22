import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Search, Music } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { SkeletonLecteurAudio } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Louange & Médias (Phase 22)
// Carnet de chants : recherche/filtre, puis vue lecture avec
// lecteur audio personnalisé. Le lecteur (et ses contrôles) n'est
// chargé qu'à l'ouverture effective d'un chant (React.lazy),
// pour ne jamais alourdir le chargement initial du carnet.
// ============================================================

const LecteurChant = lazy(() => import('./LecteurChant'))

interface Chant {
  id: string
  numero: number | null
  titre: string
  thematique: string | null
  paroles: string | null
  url_audio: string | null
}

export default function ChantsPublic() {
  const [chants, setChants] = useState<Chant[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [thematiqueFiltre, setThematiqueFiltre] = useState('')
  const [chantOuvert, setChantOuvert] = useState<Chant | null>(null)

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase.from('chants').select('id,numero,titre,thematique,paroles,url_audio').order('numero')
      if (!error && data) setChants(data as Chant[])
      setChargement(false)
    }
    charger()
  }, [])

  const thematiques = useMemo(
    () => [...new Set(chants.map(c => c.thematique).filter((t): t is string => !!t))],
    [chants]
  )

  const chantsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return chants.filter(c => {
      const correspondRecherche = q === '' || c.titre.toLowerCase().includes(q) || String(c.numero ?? '').includes(q)
      const correspondThematique = thematiqueFiltre === '' || c.thematique === thematiqueFiltre
      return correspondRecherche && correspondThematique
    })
  }, [chants, recherche, thematiqueFiltre])

  if (chantOuvert) {
    return (
      <Suspense fallback={<SkeletonLecteurAudio />}>
        <LecteurChant
          urlAudio={chantOuvert.url_audio}
          paroles={chantOuvert.paroles}
          titre={chantOuvert.numero ? `${chantOuvert.numero}. ${chantOuvert.titre}` : chantOuvert.titre}
          onRetour={() => setChantOuvert(null)}
        />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-6 text-center">Carnet de Louange</h1>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.8} />
          <input
            type="text"
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            placeholder="Rechercher par numéro ou titre..."
            className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
          />
        </div>

        {thematiques.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button type="button" onClick={() => setThematiqueFiltre('')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 ${thematiqueFiltre === '' ? 'bg-[#4F8A3D] text-white' : 'bg-white text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
              Toutes
            </button>
            {thematiques.map(t => (
              <button key={t} type="button" onClick={() => setThematiqueFiltre(t)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 ${thematiqueFiltre === t ? 'bg-[#4F8A3D] text-white' : 'bg-white text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
                {t}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm divide-y divide-[#E7F2DE] overflow-hidden">
          {chargement ? (
            <p className="px-5 py-4 text-sm text-gray-400">Chargement...</p>
          ) : chantsFiltres.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Aucun chant trouvé.</p>
          ) : chantsFiltres.map(c => (
            <button key={c.id} type="button" onClick={() => setChantOuvert(c)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F4F9F0] text-left transition-colors duration-150">
              <span className="text-sm text-[#1B3B1A]">
                {c.numero && <span className="text-gray-400 mr-2">{c.numero}.</span>}
                {c.titre}
              </span>
              {c.url_audio && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#E7F2DE] text-[#4F8A3D] px-2 py-0.5 rounded-full shrink-0">
                  <Music className="w-2.5 h-2.5" strokeWidth={2} /> Audio
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

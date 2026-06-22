import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Moon, Sun, ChevronLeft } from 'lucide-react'
import { formatDureeAudio } from '../utils/format'

// ============================================================
// Camp Biblique-Navs 2026 — Écran de lecture immersif (Phase 22c)
// Défilement indépendant des paroles avec fondu en haut/bas et
// focus lumineux par paragraphe, lecteur affiné, égaliseur animé.
// Toutes les animations utilisent uniquement transform/opacity
// (accélérées GPU), aucune ne touche layout/scroll.
// ============================================================

const CLE_MODE_NUIT = 'camp-navs-2026-mode-nuit-chants'

const STYLES = `
  @keyframes lecteurEntree { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .lecteur-entree { animation: lecteurEntree 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

  @keyframes parolesEntree { from { opacity: 0; } to { opacity: 1; } }
  .paroles-entree { animation: parolesEntree 0.5s ease-out both; }

  .paroles-scroll {
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 88%, transparent 100%);
    mask-image: linear-gradient(to bottom, transparent 0%, black 10%, black 88%, transparent 100%);
  }

  .barre-progression { -webkit-appearance: none; appearance: none; height: 3px; border-radius: 9999px; outline: none; }
  .barre-progression::-webkit-slider-thumb { -webkit-appearance: none; width: 11px; height: 11px; border-radius: 50%; background: #4F8A3D; cursor: pointer; }
  .barre-progression::-moz-range-thumb { width: 11px; height: 11px; border-radius: 50%; background: #4F8A3D; border: none; cursor: pointer; }

  @keyframes egal1 { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
  @keyframes egal2 { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(0.35); } }
  @keyframes egal3 { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(0.9); } }
  .egal-barre { transform-origin: bottom; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
  .egal-1 { animation-name: egal1; animation-duration: 0.55s; }
  .egal-2 { animation-name: egal2; animation-duration: 0.7s; }
  .egal-3 { animation-name: egal3; animation-duration: 0.62s; }
  .egal-barre.en-pause { animation-play-state: paused; }
`

function Egaliseur({ actif }: { actif: boolean }) {
  return (
    <span className="inline-flex items-end gap-[2px] h-3 w-3.5">
      <span className={`egal-barre egal-1 ${!actif ? 'en-pause' : ''} w-[3px] h-full bg-white rounded-full`} />
      <span className={`egal-barre egal-2 ${!actif ? 'en-pause' : ''} w-[3px] h-full bg-white rounded-full`} />
      <span className={`egal-barre egal-3 ${!actif ? 'en-pause' : ''} w-[3px] h-full bg-white rounded-full`} />
    </span>
  )
}

export default function LecteurChant({ urlAudio, paroles, titre, onRetour }: {
  urlAudio: string | null
  paroles: string | null
  titre: string
  onRetour: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const conteneurParolesRef = useRef<HTMLDivElement | null>(null)
  const refsParagraphes = useRef<(HTMLParagraphElement | null)[]>([])

  const [enLecture, setEnLecture] = useState(false)
  const [position, setPosition] = useState(0)
  const [duree, setDuree] = useState(0)
  const [muet, setMuet] = useState(false)
  const [modeNuit, setModeNuit] = useState(false)
  const [indexActif, setIndexActif] = useState(0)

  const paragraphes = useMemo(
    () => (paroles || '').split(/\n\s*\n/).map(p => p.trim()).filter(p => p !== ''),
    [paroles]
  )

  useEffect(() => {
    try {
      setModeNuit(localStorage.getItem(CLE_MODE_NUIT) === '1')
    } catch { /* sans incidence */ }
  }, [])

  // Focus lumineux : le paragraphe le plus proche du centre de la
  // zone de défilement passe à pleine opacité, les autres s'atténuent.
  useEffect(() => {
    const racine = conteneurParolesRef.current
    if (!racine || paragraphes.length === 0) return
    const observateur = new IntersectionObserver(
      entrees => {
        entrees.forEach(entree => {
          if (entree.isIntersecting) {
            const idx = refsParagraphes.current.findIndex(el => el === entree.target)
            if (idx !== -1) setIndexActif(idx)
          }
        })
      },
      { root: racine, rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    refsParagraphes.current.forEach(el => el && observateur.observe(el))
    return () => observateur.disconnect()
  }, [paragraphes])

  function basculerModeNuit() {
    setModeNuit(v => {
      const suivant = !v
      try { localStorage.setItem(CLE_MODE_NUIT, suivant ? '1' : '0') } catch { /* sans incidence */ }
      return suivant
    })
  }

  function basculerLecture() {
    const audio = audioRef.current
    if (!audio) return
    if (enLecture) audio.pause()
    else audio.play()
  }

  function deplacerPosition(valeur: number) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = valeur
    setPosition(valeur)
  }

  function basculerMuet() {
    const audio = audioRef.current
    if (audio) audio.muted = !muet
    setMuet(v => !v)
  }

  return (
    <div className={`min-h-screen h-screen overflow-hidden transition-colors duration-300 ${modeNuit ? 'bg-[#142B14]' : 'bg-[#F4F9F0]'}`}>
      <style>{STYLES}</style>

      {/* Bouton retour — discret, en haut à gauche */}
      <div className="fixed top-4 inset-x-4 z-20 flex items-center justify-between max-w-lg mx-auto">
        <button
          type="button"
          onClick={onRetour}
          className={`flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors duration-150 ${
            modeNuit ? 'text-white/80 bg-white/10 hover:bg-white/15' : 'text-[#5B7A56] bg-white/70 hover:bg-white'
          }`}
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={2} />
          Carnet
        </button>
        <button
          type="button"
          onClick={basculerModeNuit}
          title="Mode nuit"
          className={`p-2 rounded-full backdrop-blur-sm transition-colors duration-150 ${
            modeNuit ? 'text-[#D9A441] bg-white/10 hover:bg-white/15' : 'text-gray-400 bg-white/70 hover:bg-white'
          }`}
        >
          {modeNuit ? <Sun className="w-4 h-4" strokeWidth={1.8} /> : <Moon className="w-4 h-4" strokeWidth={1.8} />}
        </button>
      </div>

      {/* Paroles — défilement indépendant, fondu haut/bas, focus lumineux */}
      <div
        ref={conteneurParolesRef}
        className="paroles-entree paroles-scroll h-screen overflow-y-auto px-6 pt-24 pb-48 max-w-lg mx-auto"
      >
        <p className={`text-xs font-bold uppercase tracking-widest text-center mb-6 ${modeNuit ? 'text-white/40' : 'text-[#5B7A56]'}`}>
          {titre}
        </p>
        <div className="space-y-8">
          {paragraphes.length === 0 ? (
            <p className={`text-center text-lg ${modeNuit ? 'text-white/70' : 'text-[#1B3B1A]/70'}`}>
              Paroles non disponibles pour ce chant.
            </p>
          ) : paragraphes.map((p, i) => (
            <p
              key={i}
              ref={el => { refsParagraphes.current[i] = el }}
              className={`text-center text-xl sm:text-2xl leading-relaxed whitespace-pre-line transition-opacity duration-500 ${
                modeNuit ? 'text-white' : 'text-[#1B3B1A]'
              } ${i === indexActif ? 'opacity-100' : 'opacity-40'}`}
            >
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* Mini-lecteur flottant — au-dessus de la barre de navigation */}
      {urlAudio && (
        <div className="lecteur-entree fixed inset-x-4 bottom-20 sm:bottom-6 z-30 max-w-lg mx-auto">
          <div className={`rounded-3xl shadow-xl px-6 py-5 transition-colors duration-300 ${modeNuit ? 'bg-[#1B3B1A]' : 'bg-white'}`}>
            <audio
              ref={audioRef}
              src={urlAudio}
              preload="metadata"
              onPlay={() => setEnLecture(true)}
              onPause={() => setEnLecture(false)}
              onLoadedMetadata={e => setDuree(e.currentTarget.duration)}
              onTimeUpdate={e => setPosition(e.currentTarget.currentTime)}
              onEnded={() => setEnLecture(false)}
            />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 min-w-0">
                {enLecture && <Egaliseur actif={enLecture} />}
                <span className={`text-xs font-semibold truncate ${modeNuit ? 'text-white/70' : 'text-[#1B3B1A]'}`}>{titre}</span>
              </div>
              <button type="button" onClick={basculerMuet} title="Couper le son"
                className={`shrink-0 ml-2 ${modeNuit ? 'text-white/40 hover:text-white/70' : 'text-gray-300 hover:text-gray-500'}`}>
                {muet ? <VolumeX className="w-3.5 h-3.5" strokeWidth={1.8} /> : <Volume2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={basculerLecture}
                className="w-14 h-14 rounded-full bg-[#4F8A3D] hover:bg-[#3F7530] flex items-center justify-center text-white shadow-md transition-transform duration-150 active:scale-90"
              >
                {enLecture
                  ? <Pause className="w-6 h-6" fill="currentColor" strokeWidth={0} />
                  : <Play className="w-6 h-6 ml-0.5" fill="currentColor" strokeWidth={0} />}
              </button>
            </div>

            <input
              type="range"
              min={0}
              max={duree || 0}
              step={0.1}
              value={position}
              onChange={e => deplacerPosition(Number(e.target.value))}
              className="barre-progression w-full cursor-pointer"
              style={{ background: modeNuit ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }}
            />
            <div className={`flex justify-between text-[11px] mt-2 ${modeNuit ? 'text-white/50' : 'text-gray-400'}`}>
              <span>{formatDureeAudio(position)}</span>
              <span>{formatDureeAudio(duree)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

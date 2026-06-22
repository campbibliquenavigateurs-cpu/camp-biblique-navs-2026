import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Moon, Sun, ChevronLeft } from 'lucide-react'
import { formatDureeAudio } from '../utils/format'

// ============================================================
// Camp Biblique-Navs 2026 — Écran de lecture immersif (Phase 22b)
// Refonte complète : plein écran, paroles centrées en grand,
// mini-lecteur flottant au-dessus de la barre de navigation.
// Pas de dégradé (préférence déjà exprimée sur l'accueil) : fond
// uni légèrement teinté pour la profondeur.
// ============================================================

const CLE_MODE_NUIT = 'camp-navs-2026-mode-nuit-chants'

export default function LecteurChant({ urlAudio, paroles, titre, onRetour }: {
  urlAudio: string | null
  paroles: string | null
  titre: string
  onRetour: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [enLecture, setEnLecture] = useState(false)
  const [position, setPosition] = useState(0)
  const [duree, setDuree] = useState(0)
  const [muet, setMuet] = useState(false)
  const [modeNuit, setModeNuit] = useState(false)

  useEffect(() => {
    try {
      setModeNuit(localStorage.getItem(CLE_MODE_NUIT) === '1')
    } catch { /* sans incidence */ }
  }, [])

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
    <div className={`min-h-screen transition-colors duration-300 ${modeNuit ? 'bg-[#142B14]' : 'bg-[#F4F9F0]'}`}>
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

      {/* Paroles — centrées, grandes, lisibles */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-44 max-w-lg mx-auto text-center">
        <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${modeNuit ? 'text-white/40' : 'text-[#5B7A56]'}`}>
          {titre}
        </p>
        <p className={`text-xl sm:text-2xl leading-relaxed whitespace-pre-line ${modeNuit ? 'text-white' : 'text-[#1B3B1A]'}`}>
          {paroles || 'Paroles non disponibles pour ce chant.'}
        </p>
      </div>

      {/* Mini-lecteur flottant — au-dessus de la barre de navigation */}
      {urlAudio && (
        <div className="fixed inset-x-4 bottom-20 sm:bottom-6 z-30 max-w-lg mx-auto">
          <div className={`rounded-2xl shadow-xl px-5 py-4 backdrop-blur-md transition-colors duration-300 ${modeNuit ? 'bg-[#1B3B1A]/95' : 'bg-white/95'}`}>
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

            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold truncate ${modeNuit ? 'text-white/70' : 'text-[#1B3B1A]'}`}>{titre}</span>
              <button type="button" onClick={basculerMuet} title="Couper le son"
                className={`shrink-0 ml-2 ${modeNuit ? 'text-white/40 hover:text-white/70' : 'text-gray-300 hover:text-gray-500'}`}>
                {muet ? <VolumeX className="w-3.5 h-3.5" strokeWidth={1.8} /> : <Volume2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
              </button>
            </div>

            <div className="flex justify-center mb-3">
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
              className="w-full h-1.5 rounded-full accent-[#4F8A3D] cursor-pointer"
            />
            <div className={`flex justify-between text-[11px] mt-1.5 ${modeNuit ? 'text-white/50' : 'text-gray-400'}`}>
              <span>{formatDureeAudio(position)}</span>
              <span>{formatDureeAudio(duree)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

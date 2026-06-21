import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Moon, Sun } from 'lucide-react'
import { formatDureeAudio } from '../utils/format'

// ============================================================
// Camp Biblique-Navs 2026 — Lecteur audio personnalisé (Phase 22)
// Contrôles entièrement personnalisés (pas le lecteur brut du
// navigateur), chargé en différé uniquement à l'ouverture d'un
// chant (voir ChantsPublic.tsx, React.lazy).
// ============================================================

const CLE_MODE_NUIT = 'camp-navs-2026-mode-nuit-chants'

export default function LecteurChant({ urlAudio, paroles, titre }: {
  urlAudio: string | null
  paroles: string | null
  titre: string
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [enLecture, setEnLecture] = useState(false)
  const [position, setPosition] = useState(0)
  const [duree, setDuree] = useState(0)
  const [volume, setVolume] = useState(1)
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

  function changerVolume(valeur: number) {
    const audio = audioRef.current
    if (audio) audio.volume = valeur
    setVolume(valeur)
  }

  return (
    <div className={`rounded-2xl transition-colors duration-300 ${modeNuit ? 'bg-[#1B3B1A]' : 'bg-white'} shadow-sm`}>
      {urlAudio && (
        <div className={`p-5 border-b ${modeNuit ? 'border-white/10' : 'border-[#E7F2DE]'}`}>
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={basculerLecture}
              className="w-11 h-11 rounded-full bg-[#4F8A3D] hover:bg-[#3F7530] flex items-center justify-center text-white shrink-0 transition-transform duration-150 active:scale-90"
            >
              {enLecture ? <Pause className="w-5 h-5" fill="currentColor" strokeWidth={0} /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" strokeWidth={0} />}
            </button>

            <div className="flex-1">
              <input
                type="range"
                min={0}
                max={duree || 0}
                step={0.1}
                value={position}
                onChange={e => deplacerPosition(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-[#4F8A3D] cursor-pointer"
              />
              <div className={`flex justify-between text-[11px] mt-1 ${modeNuit ? 'text-white/50' : 'text-gray-400'}`}>
                <span>{formatDureeAudio(position)}</span>
                <span>{formatDureeAudio(duree)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button type="button" onClick={() => changerVolume(volume > 0 ? 0 : 1)} className={modeNuit ? 'text-white/60' : 'text-gray-400'}>
                {volume > 0 ? <Volume2 className="w-4 h-4" strokeWidth={1.8} /> : <VolumeX className="w-4 h-4" strokeWidth={1.8} />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={e => changerVolume(Number(e.target.value))}
                className="w-16 h-1.5 rounded-full accent-[#4F8A3D] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className={`text-sm font-bold ${modeNuit ? 'text-white' : 'text-[#1B3B1A]'}`}>{titre}</p>
          <button
            type="button"
            onClick={basculerModeNuit}
            title="Mode nuit"
            className={`p-2 rounded-lg transition-colors duration-150 ${modeNuit ? 'text-[#D9A441] hover:bg-white/10' : 'text-gray-400 hover:bg-[#F4F9F0]'}`}
          >
            {modeNuit ? <Sun className="w-4 h-4" strokeWidth={1.8} /> : <Moon className="w-4 h-4" strokeWidth={1.8} />}
          </button>
        </div>
        <p className={`whitespace-pre-line text-lg leading-relaxed ${modeNuit ? 'text-white/90' : 'text-[#1B3B1A]'}`}>
          {paroles || 'Paroles non disponibles pour ce chant.'}
        </p>
      </div>
    </div>
  )
}

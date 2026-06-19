import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlacesDispo } from '../hooks/usePlacesDispo'

// ============================================================
// Camp Biblique-Navs 2026 — Page d'accueil (Phase 6, allégée)
// Tarifs en badges compacts, places en pastilles sous les CTA,
// contacts déplacés dans une modale "Besoin d'aide ?".
// ============================================================

const DATE_CIBLE = new Date('2026-08-23T00:00:00Z')

interface TempsRestant { jours: number; heures: number; minutes: number; secondes: number }

function calculerTemps(): TempsRestant | null {
  const diff = DATE_CIBLE.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    jours: Math.floor(diff / 86400000),
    heures: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    secondes: Math.floor((diff % 60000) / 1000),
  }
}

function BlocCompteur({ valeur, label }: { valeur: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-[#D9A441] tabular-nums">
          {String(valeur).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest mt-1.5">{label}</span>
    </div>
  )
}

// Pastille compacte de places restantes, intégrée sous les CTA.
function PastillePlaces({ label, restant, taux }: { label: string; restant: number; taux: number }) {
  const couleur = taux >= 90 ? 'text-[#E8927B]' : taux >= 70 ? 'text-[#D9A441]' : 'text-[#9CC18F]'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/70">
      <span className={`text-base leading-none ${couleur}`}>•</span>
      {restant === 0 ? `${label} : complet` : `${restant} place${restant > 1 ? 's' : ''} ${label}`}
    </span>
  )
}

function ModaleAide({ onFermer }: { onFermer: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onFermer}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold text-[#1B3B1A]">Besoin d'aide ?</p>
          <button type="button" onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <a href="tel:+2250709626265" className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:bg-[#F4F9F0] transition-colors duration-150">
            <div>
              <p className="text-sm font-semibold text-[#1B3B1A]">Mme Obodji</p>
              <p className="text-xs text-gray-500">Paiements &amp; Trésorerie · Wave / Orange Money</p>
            </div>
            <span className="text-sm font-bold text-[#4F8A3D] shrink-0 ml-3">07 09 62 62 65</span>
          </a>
          <a href="tel:+2250709416262" className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:bg-[#F4F9F0] transition-colors duration-150">
            <div>
              <p className="text-sm font-semibold text-[#1B3B1A]">Sylvain Obodji</p>
              <p className="text-xs text-gray-500">Sous-direction · Autres informations</p>
            </div>
            <span className="text-sm font-bold text-[#4F8A3D] shrink-0 ml-3">07 09 41 62 62</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [temps, setTemps] = useState<TempsRestant | null>(calculerTemps)
  const [aideOuverte, setAideOuverte] = useState(false)
  const places = usePlacesDispo()

  useEffect(() => {
    const timer = setInterval(() => setTemps(calculerTemps()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#F4F9F0] flex flex-col">

      {/* Hero */}
      <section className="bg-[#1B3B1A] px-4 py-10 sm:py-14 text-center">
        <p className="text-[#4F8A3D] text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold mb-3">
          Mission Évangélique des Navigateurs CI
        </p>
        <h1 className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl leading-snug max-w-2xl mx-auto">
          Camp Biblique-Navs 2026
        </h1>
        <p className="text-white/70 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
          Les familles et les réseaux relationnels pour former des disciples
        </p>
        <p className="text-[#D9A441] text-xs sm:text-sm font-medium mt-1.5 italic">Jean 1 : 40–42</p>

        {/* Compte à rebours */}
        <div className="mt-8">
          {temps ? (
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <BlocCompteur valeur={temps.jours} label="Jours" />
              <span className="text-[#D9A441] text-2xl font-bold pb-5">:</span>
              <BlocCompteur valeur={temps.heures} label="Heures" />
              <span className="text-[#D9A441] text-2xl font-bold pb-5">:</span>
              <BlocCompteur valeur={temps.minutes} label="Minutes" />
              <span className="text-[#D9A441] text-2xl font-bold pb-5">:</span>
              <BlocCompteur valeur={temps.secondes} label="Secondes" />
            </div>
          ) : (
            <p className="text-[#D9A441] text-xl font-bold py-4">Le camp est en cours !</p>
          )}
          <p className="text-white/40 text-xs mt-3">23 – 29 août 2026 · La Sablière, Bingerville</p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
          <Link to="/inscription" className="px-7 py-3 rounded-xl text-sm font-bold text-white bg-[#4F8A3D] hover:bg-[#3F7530] transition-colors duration-200">
            S'inscrire maintenant
          </Link>
          <Link to="/mon-inscription" className="px-7 py-3 rounded-xl text-sm font-bold text-white/80 border border-white/30 hover:bg-white/10 transition-colors duration-200">
            Vérifier mon inscription
          </Link>
        </div>

        {/* Places restantes — pastilles compactes */}
        {places && (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-4">
            <PastillePlaces label="Adultes restantes" restant={places.restantAdultes} taux={places.tauxRemplissage.adultes} />
            <PastillePlaces label="Enfants restantes" restant={places.restantEnfants} taux={places.tauxRemplissage.enfants} />
          </div>
        )}
      </section>

      {/* Tarifs — badges compacts */}
      <section className="px-4 py-6">
        <div className="flex flex-wrap gap-3 justify-center">
          <span className="px-4 py-2 rounded-full bg-white border border-[#E7F2DE] shadow-sm text-sm font-semibold text-[#1B3B1A]">
            Enfant / Ado : <span className="text-[#D9A441] font-bold">25 000 F CFA</span>
          </span>
          <span className="px-4 py-2 rounded-full bg-white border border-[#E7F2DE] shadow-sm text-sm font-semibold text-[#1B3B1A]">
            Jeune / Adulte : <span className="text-[#D9A441] font-bold">30 000 F CFA</span>
          </span>
        </div>
      </section>

      {/* Pied de page — lien discret vers l'aide */}
      <footer className="mt-auto px-4 py-6 text-center">
        <button
          type="button"
          onClick={() => setAideOuverte(true)}
          className="text-xs text-[#5B7A56] hover:text-[#1B3B1A] hover:underline"
        >
          Besoin d'aide ?
        </button>
      </footer>

      {aideOuverte && <ModaleAide onFermer={() => setAideOuverte(false)} />}
    </div>
  )
}

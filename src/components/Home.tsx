import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlacesDispo } from '../hooks/usePlacesDispo'

// ============================================================
// Camp Biblique-Navs 2026 — Page d'accueil (refonte premium)
// Dégradé fluide (suppression de la coupure de couleur), badges
// glassmorphism, section "Participation" en cartes, et bannière
// d'installation PWA intelligente (beforeinstallprompt).
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

// Type minimal pour l'événement non-standard "beforeinstallprompt"
// (volontairement permissif : pas d'interface DOM officielle dans TypeScript).
interface EvenementInstallPWA extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function BlocCompteur({ valeur, label }: { valeur: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg shadow-black/10 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-[#D9A441] tabular-nums">
          {String(valeur).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest mt-1.5">{label}</span>
    </div>
  )
}

// Badge encapsulé pour les places restantes (remplace les puces de texte brut).
function BadgePlaces({ label, restant, taux }: { label: string; restant: number; taux: number }) {
  const styles =
    taux >= 90
      ? 'bg-[#E8927B]/15 text-[#E8927B] border-[#E8927B]/30'
      : taux >= 70
        ? 'bg-[#D9A441]/15 text-[#D9A441] border-[#D9A441]/30'
        : 'bg-white/10 text-white/80 border-white/20'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border backdrop-blur-sm text-xs font-semibold ${styles}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {restant === 0 ? `${label} : complet` : `${restant} ${label}`}
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

  // ---- Invite d'installation PWA ----
  const [evenementInstall, setEvenementInstall] = useState<EvenementInstallPWA | null>(null)
  const [banniereVisible, setBanniereVisible] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTemps(calculerTemps()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    function surBeforeInstall(e: Event) {
      e.preventDefault()
      setEvenementInstall(e as EvenementInstallPWA)
      setBanniereVisible(true)
    }
    function surInstalle() {
      setBanniereVisible(false)
      setEvenementInstall(null)
    }
    window.addEventListener('beforeinstallprompt', surBeforeInstall)
    window.addEventListener('appinstalled', surInstalle)
    return () => {
      window.removeEventListener('beforeinstallprompt', surBeforeInstall)
      window.removeEventListener('appinstalled', surInstalle)
    }
  }, [])

  async function installer() {
    if (!evenementInstall) return
    await evenementInstall.prompt()
    await evenementInstall.userChoice
    setBanniereVisible(false)
    setEvenementInstall(null)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F9F0]">

      {/* Bannière d'installation PWA */}
      {banniereVisible && (
        <div className="sticky top-0 z-50 bg-[#FBF3E0] border-b border-[#D9A441]/40 px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-[#5B4423] flex-1">
            📱 Installez l'application sur votre téléphone pour un accès rapide et hors-ligne
          </p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={installer}
              className="px-3.5 py-1.5 rounded-lg bg-[#D9A441] text-white text-xs font-bold hover:bg-[#C4933A] transition-colors duration-150"
            >
              Installer
            </button>
            <button
              type="button"
              onClick={() => setBanniereVisible(false)}
              aria-label="Fermer"
              className="text-[#5B4423]/50 hover:text-[#5B4423]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero — dégradé fluide, sans coupure de couleur brutale */}
      <section className="bg-gradient-to-b from-[#1B3B1A] via-[#3F5C3D] to-[#F4F9F0] px-4 pt-10 sm:pt-14 pb-16 text-center">
        <p className="text-[#9CC18F] text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold mb-3">
          Mission Évangélique des Navigateurs CI
        </p>
        <h1 className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl leading-snug max-w-2xl mx-auto">
          Camp Biblique-Navs 2026
        </h1>
        <p className="text-white/70 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
          Les familles et les réseaux relationnels pour former des disciples
        </p>
        <p className="text-[#D9A441] text-xs sm:text-sm font-medium mt-1.5 italic">Jean 1 : 40–42</p>

        {/* Compte à rebours — glassmorphism */}
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

        {/* CTAs — marges harmonisées */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-8 max-w-xs sm:max-w-none mx-auto">
          <Link
            to="/inscription"
            className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold text-white bg-[#4F8A3D] hover:bg-[#3F7530] transition-colors duration-200 text-center"
          >
            S'inscrire maintenant
          </Link>
          <Link
            to="/mon-inscription"
            className="w-full sm:w-auto px-7 py-3 rounded-xl text-sm font-bold text-white/85 border border-white/30 hover:bg-white/10 transition-colors duration-200 text-center"
          >
            Vérifier mon inscription
          </Link>
        </div>

        {/* Places restantes — badges encapsulés */}
        {places && (
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
            <BadgePlaces label="places Adultes restantes" restant={places.restantAdultes} taux={places.tauxRemplissage.adultes} />
            <BadgePlaces label="places Enfants restantes" restant={places.restantEnfants} taux={places.tauxRemplissage.enfants} />
          </div>
        )}
      </section>

      {/* Participation — cartes tarifs épurées */}
      <section className="px-4 py-10 bg-[#F4F9F0]">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-[#5B7A56] mb-5">
          Participation
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 text-center">
            <p className="text-xs text-gray-400 mb-1.5">Enfant / Ado</p>
            <p className="text-2xl font-bold text-[#1B3B1A]">25 000</p>
            <p className="text-xs text-gray-400 mt-0.5">F CFA</p>
          </div>
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 text-center">
            <p className="text-xs text-gray-400 mb-1.5">Jeune / Adulte</p>
            <p className="text-2xl font-bold text-[#1B3B1A]">30 000</p>
            <p className="text-xs text-gray-400 mt-0.5">F CFA</p>
          </div>
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

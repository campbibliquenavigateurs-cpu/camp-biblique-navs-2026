/// <reference types="vite-plugin-pwa/client" />
import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

// ============================================================
// Camp Biblique-Navs 2026 — Bannière de mise à jour PWA (Phase 17c)
// ============================================================
// Problème résolu : une fois l'application installée sur le
// téléphone (PWA), la nouvelle version peut rester invisible tant
// que l'app n'est pas complètement fermée puis rouverte — le
// mécanisme standard du navigateur attend que tous les onglets/
// instances ouverts de l'ancienne version soient fermés avant
// d'activer la nouvelle.
//
// Cette bannière détecte qu'une nouvelle version est prête et
// propose un bouton "Mettre à jour" qui l'active immédiatement
// (sans attendre la fermeture complète de l'app), puis recharge.
// ============================================================

export default function MiseAJourDisponible() {
  const [miseAJourPrete, setMiseAJourPrete] = useState(false)
  const [activer, setActiver] = useState<((reload?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const fonctionMiseAJour = registerSW({
      onNeedRefresh() {
        setMiseAJourPrete(true)
      },
      onRegisteredSW(_url, registration) {
        // Vérifie périodiquement (toutes les 5 minutes) si une nouvelle
        // version est disponible, plutôt que d'attendre une prochaine
        // visite naturelle — utile pour une app ouverte longtemps.
        if (!registration) return
        setInterval(() => registration.update(), 5 * 60 * 1000)
      },
    })
    setActiver(() => fonctionMiseAJour)
  }, [])

  if (!miseAJourPrete) return null

  return (
    <div className="fixed bottom-4 inset-x-4 z-[60] max-w-sm mx-auto bg-[#1B3B1A] text-white rounded-xl shadow-xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm">Une nouvelle version est disponible.</p>
      <button
        type="button"
        onClick={() => activer?.(true)}
        className="text-xs font-bold bg-white text-[#1B3B1A] px-3 py-1.5 rounded-lg shrink-0 hover:bg-gray-100"
      >
        Mettre à jour
      </button>
    </div>
  )
}

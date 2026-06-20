import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Hook places disponibles (Phase 5)
// Étendu en Phase 13 avec l'état ouvert/fermé des inscriptions,
// pour n'avoir qu'un seul appel réseau côté formulaire.
// ============================================================

export interface PlacesDispo {
  quotaAdultes: number
  quotaEnfants: number
  restantAdultes: number
  restantEnfants: number
  complet: { adultes: boolean; enfants: boolean }
  tauxRemplissage: { adultes: number; enfants: number }
  inscriptionsOuvertes: boolean
}

export function usePlacesDispo(): PlacesDispo | null {
  const [places, setPlaces] = useState<PlacesDispo | null>(null)

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase.rpc('get_places_disponibles')
      if (error || !data || data.length === 0) return

      const d = data[0] as {
        quota_adultes: number
        quota_enfants: number
        inscrits_adultes: number
        inscrits_enfants: number
        inscriptions_ouvertes: boolean
      }

      const restantAdultes = Math.max(0, d.quota_adultes - d.inscrits_adultes)
      const restantEnfants = Math.max(0, d.quota_enfants - d.inscrits_enfants)

      setPlaces({
        quotaAdultes: d.quota_adultes,
        quotaEnfants: d.quota_enfants,
        restantAdultes,
        restantEnfants,
        complet: {
          adultes: restantAdultes === 0,
          enfants: restantEnfants === 0,
        },
        tauxRemplissage: {
          adultes: d.quota_adultes > 0 ? (d.inscrits_adultes / d.quota_adultes) * 100 : 0,
          enfants: d.quota_enfants > 0 ? (d.inscrits_enfants / d.quota_enfants) * 100 : 0,
        },
        inscriptionsOuvertes: d.inscriptions_ouvertes,
      })
    }
    charger()
  }, [])

  return places
}

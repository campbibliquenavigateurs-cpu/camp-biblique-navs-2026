import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function usePlacesDispo() {
  const [places, setPlaces] = useState(null)

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase.rpc('get_places_disponibles')
      if (error || !data || data.length === 0) return
      const d = data[0]
      const restantAdultes = Math.max(0, d.quota_adultes - d.inscrits_adultes)
      const restantEnfants = Math.max(0, d.quota_enfants - d.inscrits_enfants)
      setPlaces({
        quotaAdultes: d.quota_adultes,
        quotaEnfants: d.quota_enfants,
        restantAdultes,
        restantEnfants,
        complet: { adultes: restantAdultes === 0, enfants: restantEnfants === 0 },
        tauxRemplissage: {
          adultes: d.quota_adultes > 0 ? (d.inscrits_adultes / d.quota_adultes) * 100 : 0,
          enfants: d.quota_enfants > 0 ? (d.inscrits_enfants / d.quota_enfants) * 100 : 0,
        },
      })
    }
    charger()
  }, [])

  return places
}

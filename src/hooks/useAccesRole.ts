import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Hook partagé de contrôle d'accès par rôle.
// Utilisé par tous les modules réservés au comité (Trésorerie,
// Logistique, Santé...) pour éviter de dupliquer cette logique.
//
// Important : passer un tableau de rôles STABLE (défini en dehors
// du composant, ex. const ROLES_LOGISTIQUE = ['admin', 'comite_logistique']),
// pour ne pas déclencher de nouvelle vérification à chaque rendu.
// ============================================================

export type StatutAcces = 'verification' | 'non_connecte' | 'autorise' | 'refuse'

export function useAccesRole(rolesAutorises: readonly string[]) {
  const [statutAcces, setStatutAcces] = useState<StatutAcces>('verification')
  const [profilId, setProfilId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [nomComplet, setNomComplet] = useState<string>('')

  const verifierAcces = useCallback(async () => {
    setStatutAcces('verification')
    const { data: userData } = await supabase.auth.getUser()
    const utilisateur = userData.user

    if (!utilisateur) {
      setStatutAcces('non_connecte')
      return
    }

    const { data: profil } = await supabase
      .from('profiles')
      .select('role, nom, prenoms')
      .eq('id', utilisateur.id)
      .single()

    if (profil && rolesAutorises.includes(profil.role)) {
      setProfilId(utilisateur.id)
      setRole(profil.role)
      setNomComplet(`${profil.prenoms} ${profil.nom}`.trim())
      setStatutAcces('autorise')
    } else {
      setStatutAcces('refuse')
    }
    // rolesAutorises doit être une référence stable (constante hors composant)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    verifierAcces()
  }, [verifierAcces])

  return { statutAcces, profilId, role, nomComplet, verifierAcces }
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'
import FichePatientForm from './FichePatientForm'

// ============================================================
// Camp Biblique-Navs 2026 — Module Santé (Phase 3, Étape 3)
// Réservé strictement aux rôles : admin, comite_sante
// Données médicales sensibles : aucune fuite tolérée.
// ============================================================

const ROLES_SANTE = ['admin', 'comite_sante'] as const

interface Consultation {
  id: string
  nom_malade: string
  symptomes: string | null
  traitement_administre: string | null
  materiel_medical_utilise: string | null
  date_consultation: string
}

export default function SanteDashboard() {
  const { statutAcces, profilId, nomComplet, verifierAcces } = useAccesRole(ROLES_SANTE)
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [chargement, setChargement] = useState(true)

  const chargerConsultations = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase
      .from('sante')
      .select('*')
      .order('date_consultation', { ascending: false })
      .limit(50)
    if (!error && data) setConsultations(data as Consultation[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') chargerConsultations()
  }, [statutAcces, chargerConsultations])

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }

  if (statutAcces === 'non_connecte') {
    return <Login onConnecte={verifierAcces} />
  }

  if (statutAcces === 'refuse') {
    return (
      <AccesRestreint
        titre="Accès strictement réservé"
        message="Ce module contient des données médicales confidentielles. L'accès est strictement réservé à l'administration et au comité santé du camp."
      />
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#1B3B1A]">Infirmerie du camp</h1>
            {nomComplet && <p className="text-xs text-gray-400 mt-0.5">Connecté en tant que {nomComplet}</p>}
          </div>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); verifierAcces() }}
            className="text-sm font-medium text-[#5B7A56] hover:text-[#1B3B1A] hover:underline"
          >
            Se déconnecter
          </button>
        </div>

        <FichePatientForm profilId={profilId} onAjout={chargerConsultations} />

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
          <p className="text-sm font-semibold text-[#1B3B1A] p-5 border-b border-gray-100">
            Registre des consultations
          </p>

          {chargement ? (
            <p className="text-center text-sm text-gray-400 py-8">Chargement...</p>
          ) : consultations.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Aucune consultation enregistrée pour le moment.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {consultations.map(c => (
                <li key={c.id} className="p-5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-[#1B3B1A]">{c.nom_malade}</p>
                    <p className="text-xs text-gray-400 shrink-0 ml-3">
                      {new Date(c.date_consultation).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {c.symptomes && <p className="text-sm text-gray-600">Symptômes : {c.symptomes}</p>}
                  {c.traitement_administre && (
                    <p className="text-sm text-gray-600">Traitement : {c.traitement_administre}</p>
                  )}
                  {c.materiel_medical_utilise && (
                    <p className="text-sm text-gray-400">Matériel utilisé : {c.materiel_medical_utilise}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

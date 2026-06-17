import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import TransactionForm from './TransactionForm'
import TransactionTable from './TransactionTable'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Module Trésorerie (Phase 3, Étape 2)
// Réservé aux rôles : admin, comite_treso
// ============================================================

interface Resume {
  total_entrees: number
  total_sorties: number
  solde: number
  objectif_budget: number | null
  taux_atteinte: number
}

interface DonNature {
  id: string
  donateur: string
  description: string
  valeur_estimee: number | null
  date_reception: string
}

type StatutAcces = 'verification' | 'non_connecte' | 'autorise' | 'refuse'

function formatFCFA(montant: number) {
  return Math.round(montant).toLocaleString('fr-FR') + ' F CFA'
}

export default function TresorerieDashboard() {
  const [statutAcces, setStatutAcces] = useState<StatutAcces>('verification')
  const [profilId, setProfilId] = useState<string | null>(null)
  const [resume, setResume] = useState<Resume | null>(null)
  const [donsNature, setDonsNature] = useState<DonNature[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // ---- Vérification du rôle de l'utilisateur connecté ----
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
      .select('role')
      .eq('id', utilisateur.id)
      .single()

    if (profil && (profil.role === 'admin' || profil.role === 'comite_treso')) {
      setProfilId(utilisateur.id)
      setStatutAcces('autorise')
    } else {
      setStatutAcces('refuse')
    }
  }, [])

  useEffect(() => {
    verifierAcces()
  }, [verifierAcces])

  // ---- Résumé financier (solde, budget) ----
  const chargerResume = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_resume_tresorerie').single()
    if (!error && data) setResume(data as Resume)
  }, [])

  // ---- Derniers dons en nature ----
  const chargerDonsNature = useCallback(async () => {
    const { data } = await supabase
      .from('dons_nature')
      .select('*')
      .order('date_reception', { ascending: false })
      .limit(5)
    if (data) setDonsNature(data as DonNature[])
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') {
      chargerResume()
      chargerDonsNature()
    }
  }, [statutAcces, refreshKey, chargerResume, chargerDonsNature])

  function surNouvelleTransaction() {
    setRefreshKey(k => k + 1)
  }

  // ---- États d'accès ----
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
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-[#E7F2DE]">
          <div className="w-14 h-14 rounded-full bg-[#B3492F]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-[#B3492F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-12V7a4 4 0 10-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1B3B1A] mb-2">Accès restreint</h2>
          <p className="text-gray-600 text-sm">
            Ce module est réservé à l'administration et au comité trésorerie du camp.
          </p>
        </div>
      </div>
    )
  }

  const tauxAtteinte = resume ? Math.min(resume.taux_atteinte, 100) : 0

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Trésorerie du camp</h1>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); verifierAcces() }}
            className="text-sm font-medium text-[#5B7A56] hover:text-[#1B3B1A] hover:underline"
          >
            Se déconnecter
          </button>
        </div>

        {/* Tableau de bord */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
            <p className="text-sm text-[#5B7A56] font-medium mb-1">Solde actuel</p>
            <p className={`text-2xl font-bold ${resume && resume.solde >= 0 ? 'text-[#1B3B1A]' : 'text-[#B3492F]'}`}>
              {resume ? formatFCFA(resume.solde) : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {resume ? `Entrées ${formatFCFA(resume.total_entrees)} · Sorties ${formatFCFA(resume.total_sorties)}` : ''}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 sm:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-[#5B7A56] font-medium">Taux d'atteinte du budget</p>
              <p className="text-sm font-bold text-[#1B3B1A]">{tauxAtteinte}%</p>
            </div>
            <div className="h-3 rounded-full bg-[#E7F2DE] overflow-hidden">
              <div
                className="h-full bg-[#4F8A3D] transition-all duration-500 ease-out"
                style={{ width: `${tauxAtteinte}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Objectif : {resume?.objectif_budget != null ? formatFCFA(resume.objectif_budget) : 'non défini'}
            </p>
          </div>
        </div>

        {/* Dons en nature */}
        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-3">Derniers dons en nature</p>
          {donsNature.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun don en nature enregistré pour le moment.</p>
          ) : (
            <ul className="space-y-2">
              {donsNature.map(don => (
                <li
                  key={don.id}
                  className="flex items-center justify-between text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0"
                >
                  <span className="text-[#1B3B1A]">
                    <span className="font-medium">{don.donateur}</span> — {don.description}
                  </span>
                  <span className="text-gray-400 text-xs shrink-0 ml-3">
                    {new Date(don.date_reception).toLocaleDateString('fr-FR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Formulaire d'ajout */}
        <TransactionForm profilId={profilId} onAjout={surNouvelleTransaction} />

        {/* Historique */}
        <TransactionTable refreshKey={refreshKey} />
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'
import MaterielForm from './MaterielForm'

// ============================================================
// Camp Biblique-Navs 2026 — Module Logistique (Phase 3, Étape 3)
// Réservé aux rôles : admin, comite_logistique
// Pensé pour une utilisation rapide sur smartphone, sur le terrain.
// ============================================================

const ROLES_LOGISTIQUE = ['admin', 'comite_logistique'] as const

const ETATS = ['Bon état', 'À réparer', 'Endommagé', 'Perdu'] as const

interface MaterielItem {
  id: string
  designation: string
  quantite_depart: number
  quantite_retour: number | null
  etat: string | null
  responsable: string | null
}

interface Membre {
  id: string
  nom: string
  prenoms: string
}

function couleurEtat(etat: string | null) {
  if (etat === 'Bon état') return 'bg-[#E7F2DE] text-[#1B3B1A]'
  if (etat === 'Perdu') return 'bg-[#B3492F]/10 text-[#B3492F]'
  if (etat === 'Endommagé' || etat === 'À réparer') return 'bg-[#D9A441]/15 text-[#8A6A23]'
  return 'bg-gray-100 text-gray-500'
}

export default function LogistiqueDashboard() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_LOGISTIQUE)
  const [materiel, setMateriel] = useState<MaterielItem[]>([])
  const [equipe, setEquipe] = useState<Membre[]>([])
  const [chargement, setChargement] = useState(true)
  const [afficherFormulaire, setAfficherFormulaire] = useState(false)

  const chargerMateriel = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase
      .from('logistique')
      .select('*')
      .order('designation', { ascending: true })
    if (!error && data) setMateriel(data as MaterielItem[])
    setChargement(false)
  }, [])

  const chargerEquipe = useCallback(async () => {
    const { data, error } = await supabase.rpc('lister_equipe', {
      roles: ['admin', 'comite_logistique'],
    })
    if (!error && data) setEquipe(data as Membre[])
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') {
      chargerMateriel()
      chargerEquipe()
    }
  }, [statutAcces, chargerMateriel, chargerEquipe])

  function nomResponsable(id: string | null) {
    if (!id) return 'Non assigné'
    const membre = equipe.find(m => m.id === id)
    return membre ? `${membre.prenoms} ${membre.nom}` : 'Non assigné'
  }

  async function ajusterQuantiteRetour(item: MaterielItem, delta: number) {
    const actuel = item.quantite_retour ?? 0
    const nouveau = Math.max(0, Math.min(item.quantite_depart, actuel + delta))
    if (nouveau === actuel) return

    setMateriel(prev => prev.map(m => (m.id === item.id ? { ...m, quantite_retour: nouveau } : m)))

    const { error } = await supabase.from('logistique').update({ quantite_retour: nouveau }).eq('id', item.id)
    if (error) {
      setMateriel(prev => prev.map(m => (m.id === item.id ? { ...m, quantite_retour: item.quantite_retour } : m)))
      console.error(error)
    }
  }

  async function changerEtat(item: MaterielItem, nouvelEtat: string) {
    setMateriel(prev => prev.map(m => (m.id === item.id ? { ...m, etat: nouvelEtat } : m)))
    const { error } = await supabase.from('logistique').update({ etat: nouvelEtat }).eq('id', item.id)
    if (error) console.error(error)
  }

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
    return <AccesRestreint message="Ce module est réservé à l'administration et au comité logistique du camp." />
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Logistique du camp</h1>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); verifierAcces() }}
            className="text-sm font-medium text-[#5B7A56] hover:text-[#1B3B1A] hover:underline"
          >
            Se déconnecter
          </button>
        </div>

        <button
          type="button"
          onClick={() => setAfficherFormulaire(v => !v)}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg text-sm font-semibold border-2 border-[#4F8A3D] text-[#4F8A3D] hover:bg-[#E7F2DE] transition-colors duration-200"
        >
          {afficherFormulaire ? 'Fermer' : '+ Ajouter du matériel'}
        </button>

        {afficherFormulaire && (
          <MaterielForm onAjout={() => { setAfficherFormulaire(false); chargerMateriel() }} />
        )}

        <div className="space-y-3">
          {chargement ? (
            <p className="text-center text-sm text-gray-400 py-8">Chargement...</p>
          ) : materiel.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Aucun matériel enregistré pour le moment.</p>
          ) : (
            materiel.map(item => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-[#1B3B1A]">{item.designation}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Responsable : {nomResponsable(item.responsable)}</p>
                  </div>
                  <select
                    value={item.etat ?? ''}
                    onChange={e => changerEtat(item, e.target.value)}
                    className={`text-xs font-semibold rounded-full px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] ${couleurEtat(item.etat)}`}
                  >
                    <option value="">État ?</option>
                    {ETATS.map(etat => (
                      <option key={etat} value={etat}>{etat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between bg-[#F4F9F0] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs text-gray-400">Départ</p>
                    <p className="text-lg font-bold text-[#1B3B1A]">{item.quantite_depart}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => ajusterQuantiteRetour(item, -1)}
                      className="w-9 h-9 rounded-full bg-white border border-gray-300 text-[#1B3B1A] font-bold hover:bg-gray-50 active:scale-95 transition-transform"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[3rem]">
                      <p className="text-xs text-gray-400">Retour</p>
                      <p className="text-lg font-bold text-[#1B3B1A]">{item.quantite_retour ?? '—'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => ajusterQuantiteRetour(item, 1)}
                      className="w-9 h-9 rounded-full bg-white border border-gray-300 text-[#1B3B1A] font-bold hover:bg-gray-50 active:scale-95 transition-transform"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

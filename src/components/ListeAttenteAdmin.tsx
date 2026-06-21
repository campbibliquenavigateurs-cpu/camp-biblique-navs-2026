import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { BoutonSupprimer, Pagination, paginer } from './ComposantsTableau'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Liste d'attente (Phase 14)
// Affiche les demandes reçues quand les inscriptions sont fermées
// (table "liste_attente", remplie par InscriptionsFermees.tsx).
// ============================================================

const ROLES_ADMIN = ['admin'] as const
const PAR_PAGE = 10

interface Demande {
  id: string
  nom: string
  telephone: string
  created_at: string
}

export default function ListeAttenteAdmin() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const toast = useToast()
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [chargement, setChargement] = useState(true)
  const [page, setPage] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase.from('liste_attente').select('*').order('created_at', { ascending: false })
    if (!error && data) setDemandes(data as Demande[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  async function supprimer(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('liste_attente').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Retiré de la liste avec succès.')
    charger()
  }

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }
  if (statutAcces === 'non_connecte') return <Login onConnecte={verifierAcces} />
  if (statutAcces === 'refuse') return <AccesRestreint message="Ce module est réservé à l'administration du camp." />

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Liste d'attente</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {chargement ? 'Chargement...' : `${demandes.length} demande${demandes.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                <th className="px-4 py-2.5 font-medium">Nom</th>
                <th className="px-4 py-2.5 font-medium">Téléphone</th>
                <th className="px-4 py-2.5 font-medium">Date de la demande</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F2DE]">
              {chargement ? (
                <tr><td colSpan={4} className="px-4 py-5 text-center text-gray-400">Chargement...</td></tr>
              ) : demandes.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-5 text-center text-gray-400">Aucune demande en attente.</td></tr>
              ) : paginer(demandes, page, PAR_PAGE).map(d => (
                <tr key={d.id} className="text-[#1B3B1A]">
                  <td className="px-4 py-2.5 font-medium">{d.nom}</td>
                  <td className="px-4 py-2.5">
                    <a href={`tel:+225${d.telephone}`} className="text-[#4F8A3D] hover:underline">{d.telephone}</a>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(d.created_at)}</td>
                  <td className="px-4 py-2.5">
                    <BoutonSupprimer id={d.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(d.id)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(demandes.length / PAR_PAGE))} onChange={setPage} />
      </div>
    </div>
  )
}

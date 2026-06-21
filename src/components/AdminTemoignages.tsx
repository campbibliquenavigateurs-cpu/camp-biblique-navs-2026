import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer, ToggleVisible } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Modération des témoignages (Phase 21)
// Deux files : "À valider" et "En ligne". Approbation, édition,
// suppression, mise en avant ("épingler"), export Excel complet.
// ============================================================

const ROLES_ADMIN = ['admin'] as const
const PAR_PAGE = 10

interface Commission { id: string; nom: string }
interface Temoignage {
  id: string
  contenu: string
  anonyme: boolean
  prenom_auteur: string | null
  commission_id: string | null
  nb_reactions: number
  epingle: boolean
  valide: boolean
  created_at: string
}

function ModaleEdition({ donnee, onFermer, onSauvegarde }: {
  donnee: Temoignage
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [contenu, setContenu] = useState(donnee.contenu)
  const [envoi, setEnvoi] = useState(false)
  const valide = contenu.trim().length >= 10

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = await supabase.from('temoignages').update({ contenu: contenu.trim() }).eq('id', donnee.id)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Témoignage mis à jour !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre="Modifier le témoignage" onFermer={onFermer}>
      <div className="space-y-3">
        <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

export default function AdminTemoignages() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const toast = useToast()

  const [temoignages, setTemoignages] = useState<Temoignage[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [chargement, setChargement] = useState(true)

  const [pageAValider, setPageAValider] = useState(1)
  const [pageEnLigne, setPageEnLigne] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)
  const [modaleEdition, setModaleEdition] = useState<Temoignage | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resT, resC] = await Promise.all([
      supabase.from('temoignages').select('*').order('created_at', { ascending: false }),
      supabase.from('commissions').select('id,nom'),
    ])
    if (resT.data) setTemoignages(resT.data as Temoignage[])
    if (resC.data) setCommissions(resC.data as Commission[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const nomCommission = useMemo(() => {
    const carte = new Map(commissions.map(c => [c.id, c.nom]))
    return (id: string | null) => (id ? carte.get(id) ?? '—' : '—')
  }, [commissions])

  const aValider = useMemo(() => temoignages.filter(t => !t.valide), [temoignages])
  const enLigne = useMemo(() => temoignages.filter(t => t.valide), [temoignages])

  async function approuver(id: string) {
    const { error } = await supabase.from('temoignages').update({ valide: true }).eq('id', id)
    if (error) { toast.erreur("Erreur lors de l'approbation."); return }
    toast.succes('Témoignage publié !')
    charger()
  }

  async function basculerEpingle(t: Temoignage) {
    const { error } = await supabase.from('temoignages').update({ epingle: !t.epingle }).eq('id', t.id)
    if (error) { toast.erreur('Erreur lors de la mise à jour.'); return }
    charger()
  }

  async function supprimer(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('temoignages').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Témoignage supprimé.')
    charger()
  }

  function nomAuteur(t: Temoignage): string {
    return t.anonyme ? 'Anonyme' : (t.prenom_auteur || 'Anonyme')
  }

  async function exporterExcel() {
    const { utils, writeFileXLSX } = await import('xlsx')
    const feuille = utils.json_to_sheet(
      enLigne.map(t => ({
        Date: formatDateFr(t.created_at), Auteur: nomAuteur(t), Commission: nomCommission(t.commission_id),
        Témoignage: t.contenu, "Nombre d'interactions": t.nb_reactions,
      }))
    )
    const classeur = utils.book_new()
    utils.book_append_sheet(classeur, feuille, 'Témoignages')
    writeFileXLSX(classeur, `temoignages_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
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
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Témoignages &amp; Impact</h1>
          <button type="button" onClick={exporterExcel} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
            Export Excel Témoignages
          </button>
        </div>

        {/* À valider */}
        <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
          <div className="px-5 py-3 border-b border-[#E7F2DE]">
            <p className="text-sm font-bold text-[#1B3B1A]">À valider {aValider.length > 0 && `(${aValider.length})`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Témoignage</th>
                  <th className="px-4 py-2.5 font-medium">Auteur</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7F2DE]">
                {chargement ? (
                  <SkeletonTableau lignes={3} colonnes={4} />
                ) : aValider.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-5 text-center text-gray-400">Aucun témoignage en attente.</td></tr>
                ) : paginer(aValider, pageAValider, PAR_PAGE).map(t => (
                  <tr key={t.id} className="text-[#1B3B1A] align-top">
                    <td className="px-4 py-2.5 max-w-xs"><p className="whitespace-normal line-clamp-2">{t.contenu}</p></td>
                    <td className="px-4 py-2.5 text-gray-500">{nomAuteur(t)}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(t.created_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => approuver(t.id)} className="text-xs font-semibold text-[#4F8A3D] hover:underline whitespace-nowrap">
                          Approuver
                        </button>
                        <BoutonModifier onClick={() => setModaleEdition(t)} />
                        <BoutonSupprimer id={t.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(t.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pageAValider} totalPages={Math.max(1, Math.ceil(aValider.length / PAR_PAGE))} onChange={setPageAValider} />
        </section>

        {/* En ligne */}
        <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
          <div className="px-5 py-3 border-b border-[#E7F2DE]">
            <p className="text-sm font-bold text-[#1B3B1A]">En ligne {enLigne.length > 0 && `(${enLigne.length})`}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Témoignage</th>
                  <th className="px-4 py-2.5 font-medium">Auteur</th>
                  <th className="px-4 py-2.5 font-medium">Réactions</th>
                  <th className="px-4 py-2.5 font-medium">Épinglé</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7F2DE]">
                {chargement ? (
                  <SkeletonTableau lignes={5} colonnes={5} />
                ) : enLigne.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-5 text-center text-gray-400">Aucun témoignage publié.</td></tr>
                ) : paginer(enLigne, pageEnLigne, PAR_PAGE).map(t => (
                  <tr key={t.id} className="text-[#1B3B1A] align-top">
                    <td className="px-4 py-2.5 max-w-xs"><p className="whitespace-normal line-clamp-2">{t.contenu}</p></td>
                    <td className="px-4 py-2.5 text-gray-500">{nomAuteur(t)}</td>
                    <td className="px-4 py-2.5 text-gray-500">{t.nb_reactions}</td>
                    <td className="px-4 py-2.5"><ToggleVisible visible={t.epingle} onBasculer={() => basculerEpingle(t)} /></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <BoutonModifier onClick={() => setModaleEdition(t)} />
                        <BoutonSupprimer id={t.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(t.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pageEnLigne} totalPages={Math.max(1, Math.ceil(enLigne.length / PAR_PAGE))} onChange={setPageEnLigne} />
        </section>
      </div>

      {modaleEdition && (
        <ModaleEdition donnee={modaleEdition} onFermer={() => setModaleEdition(null)} onSauvegarde={charger} />
      )}
    </div>
  )
}

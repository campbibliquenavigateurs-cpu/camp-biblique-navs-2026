import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer, ToggleVisible, CarteKPI } from './ComposantsTableau'
import { SkeletonCarteKPI, SkeletonTableau } from './Skeleton'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Administration Évaluation (Phase 18)
// Rubriques dynamiques, remise à zéro, interrupteur global,
// KPI (participation, Top 3 / Flop 3) et export Excel complet.
// ============================================================

const ROLES_ADMIN = ['admin'] as const
const PAR_PAGE = 10

interface Rubrique {
  rubrique_id: string
  nom: string
  note_moyenne: number
  nb_votes: number
}

interface Commentaire {
  rubrique: string
  note: number
  commentaire: string
  date_vote: string
}

function ModaleRubrique({ donnee, onFermer, onSauvegarde }: {
  donnee: Rubrique | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [nom, setNom] = useState(donnee?.nom ?? '')
  const [envoi, setEnvoi] = useState(false)
  const valide = nom.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = donnee
      ? await supabase.from('rubriques_evaluation').update({ nom: nom.trim() }).eq('id', donnee.rubrique_id)
      : await supabase.from('rubriques_evaluation').insert({ nom: nom.trim() })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Rubrique mise à jour !' : 'Rubrique ajoutée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la rubrique' : 'Ajouter une rubrique'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom de la rubrique</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Ex : Accueil" />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

function BoutonRemiseAZero({ id, enConfirmation, onDemanderConfirmation, onConfirmer }: {
  id: string
  enConfirmation: string | null
  onDemanderConfirmation: (id: string | null) => void
  onConfirmer: () => void
}) {
  if (enConfirmation === id) {
    return (
      <button type="button" onClick={onConfirmer} className="text-xs font-bold text-white bg-[#B3492F] px-2 py-1 rounded-md whitespace-nowrap">
        Confirmer ?
      </button>
    )
  }
  return (
    <button type="button" onClick={() => onDemanderConfirmation(id)} className="text-xs font-semibold text-[#5B7A56] hover:text-[#1B3B1A] whitespace-nowrap">
      Remettre à zéro
    </button>
  )
}

export default function EvaluationStats() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const toast = useToast()

  const [rubriques, setRubriques] = useState<Rubrique[]>([])
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [tauxParticipation, setTauxParticipation] = useState(0)
  const [chargement, setChargement] = useState(true)

  const [evaluationsOuvertes, setEvaluationsOuvertes] = useState(true)

  const [pageRubriques, setPageRubriques] = useState(1)
  const [pageCommentaires, setPageCommentaires] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)
  const [modaleRubrique, setModaleRubrique] = useState<Rubrique | 'nouveau' | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resRapport, resCommentaires, resTaux, resParam] = await Promise.all([
      supabase.rpc('get_rapport_evaluation'),
      supabase.rpc('lister_commentaires_evaluation'),
      supabase.rpc('get_taux_participation_evaluation'),
      supabase.from('parametres_camp').select('valeur').eq('cle', 'evaluations_ouvertes').maybeSingle(),
    ])
    if (resRapport.data) setRubriques(resRapport.data as Rubrique[])
    if (resCommentaires.data) setCommentaires(resCommentaires.data as Commentaire[])
    if (typeof resTaux.data === 'number') setTauxParticipation(resTaux.data)
    if (resParam.data) setEvaluationsOuvertes(Number(resParam.data.valeur) !== 0)
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const { top3, flop3 } = useMemo(() => {
    const notees = rubriques.filter(r => r.nb_votes > 0)
    const triees = [...notees].sort((a, b) => b.note_moyenne - a.note_moyenne)
    return { top3: triees.slice(0, 3), flop3: [...triees].reverse().slice(0, 3) }
  }, [rubriques])

  async function basculerOuverture() {
    const { error } = await supabase.from('parametres_camp').update({ valeur: evaluationsOuvertes ? 0 : 1 }).eq('cle', 'evaluations_ouvertes')
    if (error) { toast.erreur('Erreur lors de la mise à jour.'); return }
    setEvaluationsOuvertes(v => !v)
  }

  async function supprimerRubrique(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('rubriques_evaluation').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Rubrique supprimée.')
    charger()
  }

  async function remettreAZero(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.rpc('remettre_a_zero_rubrique', { p_rubrique_id: id })
    if (error) { toast.erreur('Erreur lors de la remise à zéro.'); return }
    toast.succes('Votes remis à zéro.')
    charger()
  }

  async function exporterExcel() {
    const { utils, writeFileXLSX } = await import('xlsx')

    const feuilleRubriques = utils.json_to_sheet(
      rubriques.map(r => ({ Rubrique: r.nom, 'Note moyenne': r.note_moyenne, 'Nombre de votes': r.nb_votes }))
    )
    const feuilleCommentaires = utils.json_to_sheet(
      commentaires.map(c => ({ Rubrique: c.rubrique, Note: c.note, Commentaire: c.commentaire, Date: formatDateFr(c.date_vote) }))
    )

    const classeur = utils.book_new()
    utils.book_append_sheet(classeur, feuilleRubriques, 'Rubriques')
    utils.book_append_sheet(classeur, feuilleCommentaires, 'Commentaires')
    writeFileXLSX(classeur, `evaluation_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
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
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Évaluation du camp</h1>
          <button type="button" onClick={exporterExcel} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
            Export Excel Évaluation
          </button>
        </div>

        {/* Interrupteur global */}
        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1B3B1A]">Évaluations publiques</p>
            <p className={`text-xs mt-0.5 ${evaluationsOuvertes ? 'text-[#4F8A3D]' : 'text-[#B3492F]'}`}>
              {evaluationsOuvertes ? 'Ouvertes — le formulaire est accessible' : 'Fermées — le formulaire est verrouillé'}
            </p>
          </div>
          <ToggleVisible visible={evaluationsOuvertes} onBasculer={basculerOuverture} />
        </div>

        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {chargement ? (
            <><SkeletonCarteKPI /><SkeletonCarteKPI /><SkeletonCarteKPI /></>
          ) : (
            <>
              <CarteKPI label="Taux de participation" valeur={`${tauxParticipation}%`} accent="text-[#4F8A3D]" />
              <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-1.5">Top 3 rubriques</p>
                {top3.length === 0 ? <p className="text-xs text-gray-300">Aucun vote encore</p> : top3.map(r => (
                  <p key={r.rubrique_id} className="text-xs text-[#1B3B1A] flex justify-between"><span>{r.nom}</span><span className="font-semibold text-[#4F8A3D]">{r.note_moyenne}/5</span></p>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
                <p className="text-xs text-gray-400 mb-1.5">Flop 3 — à surveiller</p>
                {flop3.length === 0 ? <p className="text-xs text-gray-300">Aucun vote encore</p> : flop3.map(r => (
                  <p key={r.rubrique_id} className="text-xs text-[#1B3B1A] flex justify-between"><span>{r.nom}</span><span className="font-semibold text-[#B3492F]">{r.note_moyenne}/5</span></p>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Rubriques */}
        <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
            <p className="text-sm font-bold text-[#1B3B1A]">Rubriques</p>
            <button type="button" onClick={() => setModaleRubrique('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
              + Ajouter
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Rubrique</th>
                  <th className="px-4 py-2.5 font-medium">Note moyenne</th>
                  <th className="px-4 py-2.5 font-medium">Votes</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7F2DE]">
                {chargement ? (
                  <SkeletonTableau lignes={4} colonnes={4} />
                ) : rubriques.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-5 text-center text-gray-400">Aucune rubrique enregistrée.</td></tr>
                ) : paginer(rubriques, pageRubriques, PAR_PAGE).map(r => (
                  <tr key={r.rubrique_id} className="text-[#1B3B1A]">
                    <td className="px-4 py-2.5 font-medium">{r.nom}</td>
                    <td className="px-4 py-2.5">{r.note_moyenne} / 5</td>
                    <td className="px-4 py-2.5 text-gray-500">{r.nb_votes}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <BoutonRemiseAZero id={r.rubrique_id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => remettreAZero(r.rubrique_id)} />
                        <BoutonModifier onClick={() => setModaleRubrique(r)} />
                        <BoutonSupprimer id={r.rubrique_id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimerRubrique(r.rubrique_id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pageRubriques} totalPages={Math.max(1, Math.ceil(rubriques.length / PAR_PAGE))} onChange={setPageRubriques} />
        </section>

        {/* Commentaires */}
        <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
          <div className="px-5 py-3 border-b border-[#E7F2DE]">
            <p className="text-sm font-bold text-[#1B3B1A]">Commentaires {commentaires.length > 0 && `(${commentaires.length})`}</p>
          </div>
          <div className="divide-y divide-[#E7F2DE]">
            {chargement ? (
              <p className="px-5 py-4 text-sm text-gray-400">Chargement...</p>
            ) : commentaires.length === 0 ? (
              <p className="px-5 py-4 text-sm text-gray-400">Aucun commentaire pour le moment.</p>
            ) : paginer(commentaires, pageCommentaires, PAR_PAGE).map((c, i) => (
              <div key={`${c.rubrique}-${c.date_vote}-${i}`} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[#5B7A56]">{c.rubrique}</span>
                  <span className="text-xs text-gray-400">{c.note}/5 · {formatDateFr(c.date_vote)}</span>
                </div>
                <p className="text-sm text-gray-600">{c.commentaire}</p>
              </div>
            ))}
          </div>
          <Pagination page={pageCommentaires} totalPages={Math.max(1, Math.ceil(commentaires.length / PAR_PAGE))} onChange={setPageCommentaires} />
        </section>
      </div>

      {modaleRubrique && (
        <ModaleRubrique
          donnee={modaleRubrique === 'nouveau' ? null : modaleRubrique}
          onFermer={() => setModaleRubrique(null)}
          onSauvegarde={charger}
        />
      )}
    </div>
  )
}

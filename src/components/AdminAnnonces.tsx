import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { CATEGORIES_ANNONCE, NIVEAUX_GRAVITE, DUREES_EXPIRATION, libelleGravite, calculerDateExpiration } from './annoncesConstantes'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Administration Annonces (Phase 24)
// Formulaire d'émission flash avec compteurs de caractères en
// direct, expiration automatique, et tableau de suivi paginé. Toute
// modification ou suppression se répercute instantanément côté
// public grâce à Supabase Realtime.
// ============================================================

const PAR_PAGE = 10
const LONGUEUR_TITRE_MAX = 50
const LONGUEUR_MESSAGE_MAX = 300

interface Commission { id: string; nom: string }
interface Annonce {
  id: string
  titre: string
  contenu: string
  priorite: 'low' | 'medium' | 'high'
  categorie: string
  commission_id: string | null
  date_expiration: string | null
  date_publication: string
}

function badgeGravite(p: string) {
  if (p === 'high') return { label: 'Urgent', bg: 'bg-[#B3492F]/10', text: 'text-[#B3492F]' }
  if (p === 'medium') return { label: 'Important', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'Normal', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
}

function ModaleAnnonce({ donnee, commissions, onFermer, onSauvegarde }: {
  donnee: Annonce | null
  commissions: Commission[]
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [titre, setTitre] = useState(donnee?.titre ?? '')
  const [contenu, setContenu] = useState(donnee?.contenu ?? '')
  const [categorie, setCategorie] = useState(donnee?.categorie ?? 'Général')
  const [gravite, setGravite] = useState<'low' | 'medium' | 'high'>(donnee?.priorite ?? 'low')
  const [commissionId, setCommissionId] = useState(donnee?.commission_id ?? '')
  const [duree, setDuree] = useState('aucune')
  const [envoi, setEnvoi] = useState(false)

  const valide = titre.trim() !== '' && contenu.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      titre: titre.trim(),
      contenu: contenu.trim(),
      categorie,
      priorite: gravite,
      commission_id: commissionId || null,
      date_expiration: donnee ? donnee.date_expiration : calculerDateExpiration(duree),
    }
    const { error } = donnee
      ? await supabase.from('annonces').update(payload).eq('id', donnee.id)
      : await supabase.from('annonces').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Annonce mise à jour !' : 'Annonce publiée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? "Modifier l'annonce" : 'Publier une annonce'} onFermer={onFermer}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-[#1B3B1A]">Titre</label>
            <span className={`text-xs ${titre.length >= LONGUEUR_TITRE_MAX ? 'text-[#B3492F]' : 'text-gray-400'}`}>{titre.length} / {LONGUEUR_TITRE_MAX}</span>
          </div>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} maxLength={LONGUEUR_TITRE_MAX}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Changement d'horaire" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-[#1B3B1A]">Message</label>
            <span className={`text-xs ${contenu.length >= LONGUEUR_MESSAGE_MAX ? 'text-[#B3492F]' : 'text-gray-400'}`}>{contenu.length} / {LONGUEUR_MESSAGE_MAX}</span>
          </div>
          <textarea value={contenu} onChange={e => setContenu(e.target.value)} maxLength={LONGUEUR_MESSAGE_MAX} rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Détail de l'annonce" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Catégorie</label>
            <select value={categorie} onChange={e => setCategorie(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
              {CATEGORIES_ANNONCE.map(c => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Niveau de gravité</label>
            <select value={gravite} onChange={e => setGravite(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
              {NIVEAUX_GRAVITE.map(n => <option key={n.valeur} value={n.valeur}>{n.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Commission émettrice (optionnel)</label>
          <select value={commissionId} onChange={e => setCommissionId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Aucune</option>
            {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>

        {!donnee && (
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Expiration automatique</label>
            <select value={duree} onChange={e => setDuree(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
              {DUREES_EXPIRATION.map(d => <option key={d.valeur} value={d.valeur}>{d.label}</option>)}
            </select>
          </div>
        )}

        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : donnee ? 'Enregistrer' : 'Publier'}
        </button>
      </div>
    </Modale>
  )
}

export default function AdminAnnonces() {
  const toast = useToast()
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [chargement, setChargement] = useState(true)
  const [page, setPage] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)
  const [modaleAnnonce, setModaleAnnonce] = useState<Annonce | 'nouveau' | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resAnnonces, resCommissions] = await Promise.all([
      supabase.from('annonces').select('*').order('date_publication', { ascending: false }),
      supabase.from('commissions').select('id,nom'),
    ])
    if (resAnnonces.data) setAnnonces(resAnnonces.data as Annonce[])
    if (resCommissions.data) setCommissions(resCommissions.data as Commission[])
    setChargement(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  const nomCommission = useMemo(() => {
    const carte = new Map(commissions.map(c => [c.id, c.nom]))
    return (id: string | null) => (id ? carte.get(id) ?? '—' : '—')
  }, [commissions])

  async function supprimer(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('annonces').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Annonce supprimée — disparue instantanément côté public.')
    charger()
  }

  return (
    <div className="px-4 py-6 space-y-4 bg-[#F4F9F0]">
      <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
          <p className="text-sm font-bold text-[#1B3B1A]">Annonces émises {annonces.length > 0 && `(${annonces.length})`}</p>
          <button type="button" onClick={() => setModaleAnnonce('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
            + Publier une annonce
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                <th className="px-4 py-2.5 font-medium">Titre</th>
                <th className="px-4 py-2.5 font-medium">Catégorie</th>
                <th className="px-4 py-2.5 font-medium">Gravité</th>
                <th className="px-4 py-2.5 font-medium">Commission</th>
                <th className="px-4 py-2.5 font-medium">Expiration</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F2DE]">
              {chargement ? (
                <SkeletonTableau lignes={6} colonnes={6} />
              ) : annonces.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-5 text-center text-gray-400">Aucune annonce émise.</td></tr>
              ) : paginer(annonces, page, PAR_PAGE).map(a => {
                const badge = badgeGravite(a.priorite)
                return (
                  <tr key={a.id} className="text-[#1B3B1A]">
                    <td className="px-4 py-2.5 font-medium max-w-xs"><p className="whitespace-pre-line line-clamp-2">{a.titre}</p></td>
                    <td className="px-4 py-2.5 text-gray-500">{a.categorie}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{libelleGravite(a.priorite)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{nomCommission(a.commission_id)}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{a.date_expiration ? formatDateFr(a.date_expiration) : 'Aucune'}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <BoutonModifier onClick={() => setModaleAnnonce(a)} />
                        <BoutonSupprimer id={a.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(a.id)} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(annonces.length / PAR_PAGE))} onChange={setPage} />
      </div>

      {modaleAnnonce && (
        <ModaleAnnonce
          donnee={modaleAnnonce === 'nouveau' ? null : modaleAnnonce}
          commissions={commissions}
          onFermer={() => setModaleAnnonce(null)}
          onSauvegarde={charger}
        />
      )}
    </div>
  )
}

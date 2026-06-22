import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { JOURS_CAMP, CATEGORIES_PROGRAMME, estEnCours } from './programmeConstantes'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Administration du Programme (Phase 23)
// CRUD complet + duplication sur plusieurs jours en une saisie +
// gestion des sous-options pour les ateliers simultanés + message
// d'alerte par jour (ex : journée de jeûne).
// ============================================================

const ROLES_ADMIN = ['admin'] as const
const PAR_PAGE = 10

interface Creneau {
  id: string
  jour: string
  heure_debut: string
  heure_fin: string
  categorie: string
  titre: string
  orateur: string | null
  versets: string | null
}
interface OptionAtelier { id: string; programme_id: string; titre: string; orateur: string | null; ordre: number }
interface JourInfo { jour: string; message_alerte: string | null }

function libelleJour(date: string): string {
  return JOURS_CAMP.find(j => j.date === date)?.label ?? date
}

// ============================================================
// Modale : créneau (ajout / édition) — la duplication multi-jours
// n'apparaît qu'à l'ajout (l'édition ne concerne qu'une seule ligne).
// ============================================================
function ModaleCreneau({ donnee, jourParDefaut, onFermer, onSauvegarde }: {
  donnee: Creneau | null
  jourParDefaut: string
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [jours, setJours] = useState<string[]>(donnee ? [donnee.jour] : [jourParDefaut])
  const [heureDebut, setHeureDebut] = useState(donnee?.heure_debut.slice(0, 5) ?? '')
  const [heureFin, setHeureFin] = useState(donnee?.heure_fin.slice(0, 5) ?? '')
  const [categorie, setCategorie] = useState(donnee?.categorie ?? '')
  const [titre, setTitre] = useState(donnee?.titre ?? '')
  const [orateur, setOrateur] = useState(donnee?.orateur ?? '')
  const [versets, setVersets] = useState(donnee?.versets ?? '')
  const [envoi, setEnvoi] = useState(false)

  const valide = jours.length > 0 && heureDebut !== '' && heureFin !== '' && categorie !== '' && titre.trim() !== ''

  function basculerJour(date: string) {
    setJours(prev => prev.includes(date) ? prev.filter(j => j !== date) : [...prev, date])
  }

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payloadBase = {
      heure_debut: heureDebut, heure_fin: heureFin, categorie,
      titre: titre.trim(), orateur: orateur.trim() || null, versets: versets.trim() || null,
    }

    let erreur = null
    if (donnee) {
      const { error } = await supabase.from('programme_camp').update({ ...payloadBase, jour: jours[0] }).eq('id', donnee.id)
      erreur = error
    } else {
      const { error } = await supabase.from('programme_camp').insert(jours.map(jour => ({ ...payloadBase, jour })))
      erreur = error
    }

    setEnvoi(false)
    if (erreur) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Créneau mis à jour !' : `Créneau ajouté sur ${jours.length} jour${jours.length > 1 ? 's' : ''} !`)
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le créneau' : 'Ajouter un créneau'} onFermer={onFermer}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1.5">
            {donnee ? 'Jour' : 'Jour(s) concerné(s)'}
          </label>
          {donnee ? (
            <p className="text-sm text-gray-500">{libelleJour(donnee.jour)}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {JOURS_CAMP.map(j => (
                <label key={j.date} className="flex items-center gap-1.5 text-sm text-[#1B3B1A] cursor-pointer">
                  <input type="checkbox" checked={jours.includes(j.date)} onChange={() => basculerJour(j.date)}
                    className="w-4 h-4 rounded border-gray-300 text-[#4F8A3D] focus:ring-[#4F8A3D]" />
                  {j.label}
                </label>
              ))}
            </div>
          )}
          {!donnee && jours.length > 1 && (
            <p className="text-xs text-gray-400 mt-1.5">Ce créneau sera créé sur {jours.length} journées identiques.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Heure de début</label>
            <input type="time" value={heureDebut} onChange={e => setHeureDebut(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Heure de fin</label>
            <input type="time" value={heureFin} onChange={e => setHeureFin(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Catégorie</label>
          <select value={categorie} onChange={e => setCategorie(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Sélectionner...</option>
            {CATEGORIES_PROGRAMME.map(c => <option key={c.nom} value={c.nom}>{c.nom}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Titre</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Culte d'ouverture" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Orateur (optionnel)</label>
            <input type="text" value={orateur} onChange={e => setOrateur(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Versets (optionnel)</label>
            <input type="text" value={versets} onChange={e => setVersets(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Jean 1:40-42" />
          </div>
        </div>

        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : ateliers simultanés (sous-options d'un créneau)
// ============================================================
function ModaleAteliers({ creneau, onFermer, onMaj }: {
  creneau: Creneau
  onFermer: () => void
  onMaj: () => void
}) {
  const toast = useToast()
  const [options, setOptions] = useState<OptionAtelier[]>([])
  const [titre, setTitre] = useState('')
  const [orateur, setOrateur] = useState('')
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    const { data } = await supabase.from('programme_options').select('*').eq('programme_id', creneau.id).order('ordre')
    if (data) setOptions(data as OptionAtelier[])
    setChargement(false)
  }, [creneau.id])

  useEffect(() => { charger() }, [charger])

  async function ajouter() {
    if (titre.trim() === '') return
    const { error } = await supabase.from('programme_options').insert({
      programme_id: creneau.id, titre: titre.trim(), orateur: orateur.trim() || null, ordre: options.length,
    })
    if (error) { toast.erreur("Erreur lors de l'ajout."); return }
    setTitre(''); setOrateur('')
    charger()
    onMaj()
  }

  async function supprimer(id: string) {
    const { error } = await supabase.from('programme_options').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    charger()
    onMaj()
  }

  return (
    <Modale titre={`Ateliers — ${creneau.titre}`} onFermer={onFermer}>
      <div className="space-y-3">
        {chargement ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : options.length === 0 ? (
          <p className="text-sm text-gray-400">Aucun atelier pour ce créneau.</p>
        ) : (
          <div className="space-y-2">
            {options.map(o => (
              <div key={o.id} className="flex items-center justify-between bg-[#F4F9F0] rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[#1B3B1A]">{o.titre}</p>
                  {o.orateur && <p className="text-xs text-gray-500">{o.orateur}</p>}
                </div>
                <button type="button" onClick={() => supprimer(o.id)} className="text-[#B3492F] hover:text-[#8a3722] text-xs font-semibold shrink-0">
                  Retirer
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)} placeholder="Titre de l'atelier"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
          <input type="text" value={orateur} onChange={e => setOrateur(e.target.value)} placeholder="Animateur (optionnel)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
          <button type="button" onClick={ajouter} disabled={titre.trim() === ''}
            className={`w-full py-2 rounded-lg text-sm font-semibold text-white ${titre.trim() !== '' ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
            + Ajouter l'atelier
          </button>
        </div>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : message d'alerte du jour (ex : journée de jeûne)
// ============================================================
function ModaleMessageJour({ jour, messageActuel, onFermer, onSauvegarde }: {
  jour: string
  messageActuel: string | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [message, setMessage] = useState(messageActuel ?? '')
  const [envoi, setEnvoi] = useState(false)

  async function soumettre() {
    setEnvoi(true)
    const { error } = await supabase.from('programme_jours').upsert({ jour, message_alerte: message.trim() || null })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Message mis à jour !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={`Message spécial — ${libelleJour(jour)}`} onFermer={onFermer}>
      <div className="space-y-3">
        <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
          placeholder="Ex : Cette journée est entièrement consacrée au jeûne et à la prière." />
        <p className="text-xs text-gray-400">Laisser vide pour ne rien afficher.</p>
        <button type="button" onClick={soumettre} disabled={envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${!envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : dupliquer un créneau existant vers d'autres jours
// ============================================================
function ModaleDupliquer({ creneau, onFermer, onSauvegarde }: {
  creneau: Creneau
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [joursChoisis, setJoursChoisis] = useState<string[]>([])
  const [envoi, setEnvoi] = useState(false)
  const joursDisponibles = JOURS_CAMP.filter(j => j.date !== creneau.jour)

  function basculerJour(date: string) {
    setJoursChoisis(prev => prev.includes(date) ? prev.filter(j => j !== date) : [...prev, date])
  }

  async function soumettre() {
    if (joursChoisis.length === 0) return
    setEnvoi(true)
    const { error } = await supabase.from('programme_camp').insert(
      joursChoisis.map(jour => ({
        jour,
        heure_debut: creneau.heure_debut,
        heure_fin: creneau.heure_fin,
        categorie: creneau.categorie,
        titre: creneau.titre,
        orateur: creneau.orateur,
        versets: creneau.versets,
      }))
    )
    setEnvoi(false)
    if (error) { toast.erreur('Erreur lors de la duplication.'); return }
    toast.succes(`Créneau dupliqué sur ${joursChoisis.length} jour${joursChoisis.length > 1 ? 's' : ''} !`)
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={`Dupliquer — ${creneau.titre}`} onFermer={onFermer}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500">Choisis les journées vers lesquelles copier ce créneau ({libelleJour(creneau.jour)}, {creneau.heure_debut.slice(0, 5)}–{creneau.heure_fin.slice(0, 5)}).</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {joursDisponibles.map(j => (
            <label key={j.date} className="flex items-center gap-1.5 text-sm text-[#1B3B1A] cursor-pointer">
              <input type="checkbox" checked={joursChoisis.includes(j.date)} onChange={() => basculerJour(j.date)}
                className="w-4 h-4 rounded border-gray-300 text-[#4F8A3D] focus:ring-[#4F8A3D]" />
              {j.label}
            </label>
          ))}
        </div>
        <button type="button" onClick={soumettre} disabled={joursChoisis.length === 0 || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${joursChoisis.length > 0 && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Duplication...' : 'Dupliquer'}
        </button>
      </div>
    </Modale>
  )
}

export default function AdminProgramme() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const toast = useToast()

  const [creneaux, setCreneaux] = useState<Creneau[]>([])
  const [joursInfo, setJoursInfo] = useState<JourInfo[]>([])
  const [chargement, setChargement] = useState(true)
  const [filtreJour, setFiltreJour] = useState('')
  const [page, setPage] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  const [modaleCreneau, setModaleCreneau] = useState<Creneau | 'nouveau' | null>(null)
  const [modaleAteliers, setModaleAteliers] = useState<Creneau | null>(null)
  const [modaleMessageJour, setModaleMessageJour] = useState<string | null>(null)
  const [modaleDupliquer, setModaleDupliquer] = useState<Creneau | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resCreneaux, resJours] = await Promise.all([
      supabase.from('programme_camp').select('*').order('jour').order('heure_debut'),
      supabase.from('programme_jours').select('*'),
    ])
    if (resCreneaux.data) setCreneaux(resCreneaux.data as Creneau[])
    if (resJours.data) setJoursInfo(resJours.data as JourInfo[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const creneauxFiltres = useMemo(
    () => filtreJour === '' ? creneaux : creneaux.filter(c => c.jour === filtreJour),
    [creneaux, filtreJour]
  )

  async function supprimer(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('programme_camp').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Créneau supprimé.')
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
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Programme du Camp</h1>
          <button type="button" onClick={() => setModaleCreneau('nouveau')} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
            + Ajouter un créneau
          </button>
        </div>

        {/* Messages spéciaux par jour */}
        <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-bold text-[#1B3B1A] mb-3">Messages spéciaux par jour</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {JOURS_CAMP.map(j => {
              const info = joursInfo.find(ji => ji.jour === j.date)
              return (
                <button key={j.date} type="button" onClick={() => setModaleMessageJour(j.date)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors duration-150 ${info?.message_alerte ? 'border-[#D9A441]/40 bg-[#D9A441]/10 text-[#8A6A23]' : 'border-gray-200 text-gray-500 hover:border-[#4F8A3D]'}`}>
                  <p className="font-semibold">{j.label}</p>
                  <p className="truncate">{info?.message_alerte || 'Aucun message'}</p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Tableau des créneaux */}
        <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
          <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#E7F2DE]">
            <button type="button" onClick={() => { setFiltreJour(''); setPage(1) }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${filtreJour === '' ? 'bg-[#4F8A3D] text-white' : 'bg-[#F4F9F0] text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
              Tous
            </button>
            {JOURS_CAMP.map(j => (
              <button key={j.date} type="button" onClick={() => { setFiltreJour(j.date); setPage(1) }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap ${filtreJour === j.date ? 'bg-[#4F8A3D] text-white' : 'bg-[#F4F9F0] text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
                {j.label}
              </button>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                  <th className="px-4 py-2.5 font-medium">Jour</th>
                  <th className="px-4 py-2.5 font-medium">Horaire</th>
                  <th className="px-4 py-2.5 font-medium">Catégorie</th>
                  <th className="px-4 py-2.5 font-medium">Titre</th>
                  <th className="px-4 py-2.5 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7F2DE]">
                {chargement ? (
                  <SkeletonTableau lignes={6} colonnes={5} />
                ) : creneauxFiltres.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-5 text-center text-gray-400">Aucun créneau enregistré.</td></tr>
                ) : paginer(creneauxFiltres, page, PAR_PAGE).map(c => {
                  const enCours = estEnCours(c.jour, c.heure_debut, c.heure_fin)
                  return (
                  <tr key={c.id} className={enCours ? 'bg-[#D9A441]/10' : 'text-[#1B3B1A]'}>
                    <td className="px-4 py-2.5 text-gray-500">{libelleJour(c.jour)}</td>
                    <td className="px-4 py-2.5">
                      {c.heure_debut.slice(0, 5)} – {c.heure_fin.slice(0, 5)}
                      {enCours && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-[#D9A441] text-white">En cours</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.categorie}</td>
                    <td className="px-4 py-2.5 font-medium">{c.titre}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {c.categorie === 'Ateliers simultanés' && (
                          <button type="button" onClick={() => setModaleAteliers(c)} className="text-xs font-semibold text-[#5B7A56] hover:text-[#1B3B1A] whitespace-nowrap">
                            Ateliers
                          </button>
                        )}
                        <button type="button" onClick={() => setModaleDupliquer(c)} className="text-xs font-semibold text-[#5B7A56] hover:text-[#1B3B1A] whitespace-nowrap">
                          Dupliquer
                        </button>
                        <BoutonModifier onClick={() => setModaleCreneau(c)} />
                        <BoutonSupprimer id={c.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(c.id)} />
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={Math.max(1, Math.ceil(creneauxFiltres.length / PAR_PAGE))} onChange={setPage} />
        </section>
      </div>

      {modaleCreneau && (
        <ModaleCreneau
          donnee={modaleCreneau === 'nouveau' ? null : modaleCreneau}
          jourParDefaut={filtreJour || JOURS_CAMP[0].date}
          onFermer={() => setModaleCreneau(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleAteliers && (
        <ModaleAteliers creneau={modaleAteliers} onFermer={() => setModaleAteliers(null)} onMaj={charger} />
      )}
      {modaleMessageJour && (
        <ModaleMessageJour
          jour={modaleMessageJour}
          messageActuel={joursInfo.find(j => j.jour === modaleMessageJour)?.message_alerte ?? null}
          onFermer={() => setModaleMessageJour(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleDupliquer && (
        <ModaleDupliquer creneau={modaleDupliquer} onFermer={() => setModaleDupliquer(null)} onSauvegarde={charger} />
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Droplet, Phone, PhoneCall, X, Search, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { recupererApresEchecChargement } from '../utils/recuperation'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Santé complète (Phase 20)
// 3 onglets : Suivi des campeurs, Main courante, Pharmacie.
// Motifs et statuts de sortie personnalisables, dispense rapide,
// historique par patient consultable, patients actuellement suivis,
// exports Excel/PDF complets. Écran strictement confidentiel
// (admin / comité santé uniquement).
// ============================================================

const ROLES_SANTE = ['admin', 'comite_sante'] as const
const PAR_PAGE = 10
const PAR_PAGE_HISTORIQUE_PATIENT = 5

const JOURS_CAMP = ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29']
const MOMENTS: { v: 'matin' | 'midi' | 'soir'; l: string }[] = [
  { v: 'matin', l: 'Matin' }, { v: 'midi', l: 'Midi' }, { v: 'soir', l: 'Soir' },
]

const STYLES = `
  @keyframes glisserDepuisDroite { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .drawer-entree { animation: glisserDepuisDroite 0.25s ease-out; }
`

function badgeStatutSortie(s: string | null) {
  if (!s) return { label: '—', bg: 'bg-gray-50', text: 'text-gray-400' }
  const t = s.toLowerCase()
  if (t.includes('évacuation') || t.includes('evacuation')) return { label: s, bg: 'bg-[#B3492F]/10', text: 'text-[#B3492F]' }
  if (t.includes('repos') || t.includes('cabine')) return { label: s, bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: s, bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
}

function estEnSuivi(statut: string | null): boolean {
  if (!statut) return false
  const t = statut.toLowerCase()
  return t.includes('repos') || t.includes('cabine') || t.includes('évacuation') || t.includes('evacuation')
}

// ---- Types ----
interface Inscription {
  id: string
  nom: string
  prenoms: string
  telephone: string
  antecedents_medicaux: string | null
  contact_urgence_nom: string | null
  contact_urgence_telephone: string | null
  commission_id: string | null
}
interface Commission { id: string; nom: string }
interface ProfilMedical {
  inscription_id: string
  groupe_sanguin: string | null
  traitement_chronique: boolean
  traitement_nom: string | null
}
interface SuiviJour { inscription_id: string; date_jour: string; moment: string; pris: boolean }
interface Medicament { id: string; nom: string; quantite_stock: number; unite: string | null; seuil_alerte: number | null }
interface OptionListe { id: string; nom: string }
interface Consultation {
  id: string
  inscription_id: string
  motif: string | null
  temperature: number | null
  tension: string | null
  description_soins: string | null
  medicament_id: string | null
  quantite_distribuee: number | null
  statut_sortie: string | null
  type_entree: string
  created_at: string
}

function aUneAlerte(antecedents: string | null): boolean {
  if (!antecedents) return false
  const t = antecedents.trim().toLowerCase()
  return t !== '' && t !== 'aucun' && t !== 'aucune'
}

// ============================================================
// Modale générique : ajouter un élément à une liste personnalisable
// (motifs de consultation ou statuts de sortie)
// ============================================================
function ModaleOptionListe({ table, titre, placeholder, onFermer, onSauvegarde }: {
  table: 'motifs_consultation' | 'statuts_sortie'
  titre: string
  placeholder: string
  onFermer: () => void
  onSauvegarde: (nom: string) => void
}) {
  const toast = useToast()
  const [nom, setNom] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const valide = nom.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = await supabase.from(table).insert({ nom: nom.trim() })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Ajouté avec succès !')
    onSauvegarde(nom.trim())
    onFermer()
  }

  return (
    <Modale titre={titre} onFermer={onFermer}>
      <div className="space-y-3">
        <input type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Ajouter'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : médicament (ajout / édition) avec seuil d'alerte
// ============================================================
function ModaleMedicament({ donnee, onFermer, onSauvegarde }: {
  donnee: Medicament | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [nom, setNom] = useState(donnee?.nom ?? '')
  const [quantite, setQuantite] = useState(donnee ? String(donnee.quantite_stock) : '')
  const [unite, setUnite] = useState(donnee?.unite ?? '')
  const [seuilAlerte, setSeuilAlerte] = useState(donnee ? String(donnee.seuil_alerte ?? '') : '')
  const [envoi, setEnvoi] = useState(false)
  const valide = nom.trim() !== '' && quantite !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      nom: nom.trim(),
      quantite_stock: Number(quantite),
      unite: unite.trim() || null,
      seuil_alerte: seuilAlerte === '' ? null : Number(seuilAlerte),
    }
    const { error } = donnee
      ? await supabase.from('pharmacie_stock').update(payload).eq('id', donnee.id)
      : await supabase.from('pharmacie_stock').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Médicament mis à jour !' : 'Médicament ajouté au stock !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le médicament' : 'Ajouter un médicament au stock'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Paracétamol 500mg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Quantité en stock</label>
            <input type="number" min={0} value={quantite} onChange={e => setQuantite(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : 100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Unité</label>
            <input type="text" value={unite} onChange={e => setUnite(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : comprimés" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Seuil d'alerte (optionnel)</label>
          <input type="number" min={0} value={seuilAlerte} onChange={e => setSeuilAlerte(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : 10" />
          <p className="text-xs text-gray-400 mt-1">Le stock sera signalé en rouge sous ce seuil.</p>
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
// Modale : dispense rapide (sans consultation complète)
// ============================================================
function ModaleDispenseRapide({ campeur, medicaments, onFermer, onEnregistre }: {
  campeur: Inscription
  medicaments: Medicament[]
  onFermer: () => void
  onEnregistre: () => void
}) {
  const toast = useToast()
  const [medicamentId, setMedicamentId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const medicamentChoisi = medicaments.find(m => m.id === medicamentId)
  const valide = medicamentId !== '' && quantite !== '' && Number(quantite) > 0

  async function soumettre() {
    if (!valide) return
    if (medicamentChoisi && Number(quantite) > medicamentChoisi.quantite_stock) {
      toast.erreur('Quantité supérieure au stock disponible.')
      return
    }
    setEnvoi(true)
    const { error } = await supabase.from('consultations_medicales').insert({
      inscription_id: campeur.id,
      medicament_id: medicamentId,
      quantite_distribuee: Number(quantite),
      type_entree: 'dispense_rapide',
    })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Dispense enregistrée !')
    onEnregistre()
  }

  return (
    <Modale titre={`Dispense rapide — ${campeur.prenoms} ${campeur.nom}`} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Médicament</label>
          <select value={medicamentId} onChange={e => setMedicamentId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Sélectionner...</option>
            {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} (stock : {m.quantite_stock} {m.unite ?? ''})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Quantité distribuée</label>
          <input type="number" min={1} value={quantite} onChange={e => setQuantite(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Valider la dispense'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Fiche d'urgence — volet latéral (drawer), avec historique
// personnel des consultations (paginé à 5 lignes).
// ============================================================
function FicheUrgence({ campeur, commissions, profil, suivi, consultationsPatient, nomMedicament, onFermer, onMaj }: {
  campeur: Inscription
  commissions: Commission[]
  profil: ProfilMedical | undefined
  suivi: SuiviJour[]
  consultationsPatient: Consultation[]
  nomMedicament: (id: string | null) => string
  onFermer: () => void
  onMaj: () => void
}) {
  const toast = useToast()
  const [groupeSanguin, setGroupeSanguin] = useState(profil?.groupe_sanguin ?? '')
  const [traitementChronique, setTraitementChronique] = useState(profil?.traitement_chronique ?? false)
  const [traitementNom, setTraitementNom] = useState(profil?.traitement_nom ?? '')
  const [commissionId, setCommissionId] = useState(campeur.commission_id ?? '')
  const [envoi, setEnvoi] = useState(false)
  const [pageHistorique, setPageHistorique] = useState(1)
  const [confirmationConsultationId, setConfirmationConsultationId] = useState<string | null>(null)

  async function enregistrerProfil() {
    setEnvoi(true)
    const [r1, r2] = await Promise.all([
      supabase.from('profils_medicaux').upsert({
        inscription_id: campeur.id,
        groupe_sanguin: groupeSanguin.trim() || null,
        traitement_chronique: traitementChronique,
        traitement_nom: traitementNom.trim() || null,
      }),
      supabase.from('inscriptions').update({ commission_id: commissionId || null }).eq('id', campeur.id),
    ])
    setEnvoi(false)
    if (r1.error || r2.error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Fiche mise à jour !')
    onMaj()
  }

  async function basculerPrise(dateJour: string, moment: string, actuel: boolean) {
    const { error } = await supabase.from('suivi_traitement').upsert({
      inscription_id: campeur.id, date_jour: dateJour, moment, pris: !actuel,
    }, { onConflict: 'inscription_id,date_jour,moment' })
    if (error) { toast.erreur('Erreur lors de la mise à jour.'); return }
    onMaj()
  }

  async function supprimerConsultation(id: string) {
    setConfirmationConsultationId(null)
    const { error } = await supabase.from('consultations_medicales').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Consultation supprimée.')
    onMaj()
  }

  const nomCommission = commissions.find(c => c.id === commissionId)?.nom

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onFermer}>
      <style>{STYLES}</style>
      <div className="absolute inset-0 bg-black/40" />
      <div className="drawer-entree relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg font-bold text-[#1B3B1A]">{campeur.prenoms} {campeur.nom}</p>
          <button type="button" onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="bg-[#B3492F]/5 border border-[#B3492F]/20 rounded-xl p-4 flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#B3492F]/10 flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6 text-[#B3492F]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Groupe sanguin</p>
            <input type="text" value={groupeSanguin} onChange={e => setGroupeSanguin(e.target.value)} placeholder="Ex : O+"
              className="text-lg font-bold text-[#B3492F] bg-transparent border-0 focus:outline-none w-24" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Commission d'affectation</label>
          <select value={commissionId} onChange={e => setCommissionId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Aucune</option>
            {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          {nomCommission && <p className="text-xs text-gray-400 mt-1">Pour le localiser rapidement sur le camp.</p>}
        </div>

        <div className="mb-4">
          <p className="text-sm font-medium text-[#1B3B1A] mb-1">Antécédents renseignés à l'inscription</p>
          <p className={`text-sm rounded-lg px-3 py-2 ${aUneAlerte(campeur.antecedents_medicaux) ? 'bg-[#B3492F]/10 text-[#B3492F]' : 'bg-gray-50 text-gray-400'}`}>
            {campeur.antecedents_medicaux || 'Aucun renseigné'}
          </p>
        </div>

        <div className="mb-4 border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={traitementChronique} onChange={e => setTraitementChronique(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#4F8A3D] focus:ring-[#4F8A3D]" />
            <span className="text-sm font-medium text-[#1B3B1A]">Traitement chronique en cours</span>
          </label>
          {traitementChronique && (
            <input type="text" value={traitementNom} onChange={e => setTraitementNom(e.target.value)} placeholder="Nom du traitement"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] mb-3" />
          )}
          {traitementChronique && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-gray-400 font-normal pb-1">Jour</th>
                    {MOMENTS.map(m => <th key={m.v} className="text-gray-400 font-normal pb-1">{m.l}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {JOURS_CAMP.map(jour => (
                    <tr key={jour} className="border-t border-gray-50">
                      <td className="py-1.5 text-[#1B3B1A]">{new Date(jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</td>
                      {MOMENTS.map(m => {
                        const entree = suivi.find(s => s.date_jour === jour && s.moment === m.v)
                        const pris = entree?.pris ?? false
                        return (
                          <td key={m.v} className="text-center py-1.5">
                            <button type="button" onClick={() => basculerPrise(jour, m.v, pris)}
                              className={`w-5 h-5 rounded-md border-2 inline-flex items-center justify-center transition-colors duration-150 ${pris ? 'bg-[#4F8A3D] border-[#4F8A3D]' : 'border-gray-300'}`}>
                              {pris && <span className="text-white text-[10px]">✓</span>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button type="button" onClick={enregistrerProfil} disabled={envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mb-4 ${!envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer la fiche'}
        </button>

        <div className="border-t border-gray-100 pt-4 space-y-2 mb-4">
          <a href={`tel:+225${campeur.telephone}`}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
            <Phone className="w-4 h-4" strokeWidth={1.8} /> Contacter le campeur
          </a>
          {campeur.contact_urgence_telephone && (
            <a href={`tel:+225${campeur.contact_urgence_telephone}`}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#B3492F] hover:bg-[#8a3722]">
              <PhoneCall className="w-4 h-4" strokeWidth={1.8} /> Contacter {campeur.contact_urgence_nom || 'le tuteur / urgence'}
            </a>
          )}
        </div>

        {/* Historique personnel des consultations */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-bold text-[#1B3B1A] mb-2">Historique des soins {consultationsPatient.length > 0 && `(${consultationsPatient.length})`}</p>
          {consultationsPatient.length === 0 ? (
            <p className="text-xs text-gray-400">Aucune consultation enregistrée pour ce campeur.</p>
          ) : (
            <>
              <div className="space-y-2">
                {paginer(consultationsPatient, pageHistorique, PAR_PAGE_HISTORIQUE_PATIENT).map(c => {
                  const badge = badgeStatutSortie(c.statut_sortie)
                  return (
                    <div key={c.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#1B3B1A]">{c.motif || (c.type_entree === 'dispense_rapide' ? 'Dispense rapide' : '—')}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-gray-400">{formatDateFr(c.created_at)}</span>
                          <BoutonSupprimer
                            id={c.id}
                            enConfirmation={confirmationConsultationId}
                            onDemanderConfirmation={setConfirmationConsultationId}
                            onConfirmer={() => supprimerConsultation(c.id)}
                          />
                        </div>
                      </div>
                      {(c.temperature || c.tension) && (
                        <p className="text-xs text-gray-500">{c.temperature ? `${c.temperature}°C` : ''}{c.temperature && c.tension ? ' · ' : ''}{c.tension ?? ''}</p>
                      )}
                      {c.medicament_id && <p className="text-xs text-gray-500">Médicament : {nomMedicament(c.medicament_id)} ({c.quantite_distribuee})</p>}
                      {c.statut_sortie && (
                        <span className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <Pagination page={pageHistorique} totalPages={Math.max(1, Math.ceil(consultationsPatient.length / PAR_PAGE_HISTORIQUE_PATIENT))} onChange={setPageHistorique} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Formulaire de consultation rapide (Main Courante), avec
// motifs et statuts personnalisables à la volée.
// ============================================================
function FormulaireConsultation({ campeur, medicaments, motifs, statuts, onAnnuler, onEnregistre, onNouveauMotif, onNouveauStatut }: {
  campeur: Inscription
  medicaments: Medicament[]
  motifs: OptionListe[]
  statuts: OptionListe[]
  onAnnuler: () => void
  onEnregistre: () => void
  onNouveauMotif: () => void
  onNouveauStatut: () => void
}) {
  const toast = useToast()
  const [motif, setMotif] = useState('')
  const [temperature, setTemperature] = useState('')
  const [tension, setTension] = useState('')
  const [description, setDescription] = useState('')
  const [medicamentId, setMedicamentId] = useState('')
  const [quantite, setQuantite] = useState('')
  const [statutSortie, setStatutSortie] = useState('')
  const [envoi, setEnvoi] = useState(false)

  const medicamentChoisi = medicaments.find(m => m.id === medicamentId)
  const valide = motif !== '' && statutSortie !== ''

  async function enregistrer() {
    if (!valide) return
    if (medicamentId && medicamentChoisi && Number(quantite) > medicamentChoisi.quantite_stock) {
      toast.erreur('Quantité supérieure au stock disponible.')
      return
    }
    setEnvoi(true)
    const { error } = await supabase.from('consultations_medicales').insert({
      inscription_id: campeur.id,
      motif,
      temperature: temperature === '' ? null : Number(temperature),
      tension: tension.trim() || null,
      description_soins: description.trim() || null,
      medicament_id: medicamentId || null,
      quantite_distribuee: medicamentId && quantite !== '' ? Number(quantite) : null,
      statut_sortie: statutSortie,
      type_entree: 'consultation',
    })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Consultation enregistrée !')
    onEnregistre()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-[#1B3B1A]">Consultation — {campeur.prenoms} {campeur.nom}</p>
        <button type="button" onClick={onAnnuler} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-[#1B3B1A]">Motif</label>
          <button type="button" onClick={onNouveauMotif} className="text-xs font-semibold text-[#5B7A56] hover:text-[#1B3B1A]">+ Autre motif</button>
        </div>
        <select value={motif} onChange={e => setMotif(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
          <option value="">Sélectionner...</option>
          {motifs.map(m => <option key={m.id} value={m.nom}>{m.nom}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Température (°C)</label>
          <input type="number" step="0.1" value={temperature} onChange={e => setTemperature(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : 38.5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Tension</label>
          <input type="text" value={tension} onChange={e => setTension(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : 120/80" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Soins prodigués</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Description des soins" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Médicament distribué</label>
          <select value={medicamentId} onChange={e => setMedicamentId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Aucun</option>
            {medicaments.map(m => <option key={m.id} value={m.id}>{m.nom} (stock : {m.quantite_stock} {m.unite ?? ''})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Quantité</label>
          <input type="number" min={0} value={quantite} onChange={e => setQuantite(e.target.value)} disabled={!medicamentId}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] disabled:bg-gray-50" />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-[#1B3B1A]">Statut de sortie</label>
          <button type="button" onClick={onNouveauStatut} className="text-xs font-semibold text-[#5B7A56] hover:text-[#1B3B1A]">+ Autre statut</button>
        </div>
        <select value={statutSortie} onChange={e => setStatutSortie(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
          <option value="">Sélectionner...</option>
          {statuts.map(s => <option key={s.id} value={s.nom}>{s.nom}</option>)}
        </select>
      </div>

      <button type="button" onClick={enregistrer} disabled={!valide || envoi}
        className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
        {envoi ? 'Enregistrement...' : 'Valider la consultation'}
      </button>
    </div>
  )
}

// ============================================================
// Composant principal
// ============================================================
export default function SanteDashboard() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_SANTE)
  const toast = useToast()

  const [sousEcran, setSousEcran] = useState<'suivi' | 'main_courante' | 'pharmacie'>('suivi')

  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [profils, setProfils] = useState<ProfilMedical[]>([])
  const [suivi, setSuivi] = useState<SuiviJour[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [motifs, setMotifs] = useState<OptionListe[]>([])
  const [statuts, setStatuts] = useState<OptionListe[]>([])
  const [chargement, setChargement] = useState(true)

  const [filtreSuivi, setFiltreSuivi] = useState<'tous' | 'alertes' | 'chroniques'>('tous')
  const [pageSuivi, setPageSuivi] = useState(1)
  const [pageConsultations, setPageConsultations] = useState(1)
  const [pagePharmacie, setPagePharmacie] = useState(1)

  const [campeurOuvert, setCampeurOuvert] = useState<Inscription | null>(null)
  const [modaleMedicament, setModaleMedicament] = useState<Medicament | 'nouveau' | null>(null)
  const [modaleMotif, setModaleMotif] = useState(false)
  const [modaleStatut, setModaleStatut] = useState(false)
  const [modaleDispense, setModaleDispense] = useState<Inscription | null>(null)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  const [rechercheConsultation, setRechercheConsultation] = useState('')
  const [campeurConsultation, setCampeurConsultation] = useState<Inscription | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resInsc, resCom, resProfils, resSuivi, resMed, resConsult, resMotifs, resStatuts] = await Promise.all([
      supabase.from('inscriptions').select('id,nom,prenoms,telephone,antecedents_medicaux,contact_urgence_nom,contact_urgence_telephone,commission_id').order('nom'),
      supabase.from('commissions').select('id,nom').order('nom'),
      supabase.from('profils_medicaux').select('*'),
      supabase.from('suivi_traitement').select('*'),
      supabase.from('pharmacie_stock').select('*').order('nom'),
      supabase.from('consultations_medicales').select('*').order('created_at', { ascending: false }),
      supabase.from('motifs_consultation').select('id,nom').order('ordre'),
      supabase.from('statuts_sortie').select('id,nom').order('ordre'),
    ])
    if (resInsc.data) setInscriptions(resInsc.data as Inscription[])
    if (resCom.data) setCommissions(resCom.data as Commission[])
    if (resProfils.data) setProfils(resProfils.data as ProfilMedical[])
    if (resSuivi.data) setSuivi(resSuivi.data as SuiviJour[])
    if (resMed.data) setMedicaments(resMed.data as Medicament[])
    if (resConsult.data) setConsultations(resConsult.data as Consultation[])
    if (resMotifs.data) setMotifs(resMotifs.data as OptionListe[])
    if (resStatuts.data) setStatuts(resStatuts.data as OptionListe[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const profilDe = useCallback((id: string) => profils.find(p => p.inscription_id === id), [profils])
  const nomCampeur = useCallback((id: string) => {
    const c = inscriptions.find(i => i.id === id)
    return c ? `${c.prenoms} ${c.nom}` : '—'
  }, [inscriptions])
  const nomMedicament = useCallback((id: string | null) => {
    if (!id) return '—'
    return medicaments.find(m => m.id === id)?.nom ?? '—'
  }, [medicaments])

  const inscriptionsFiltrees = useMemo(() => {
    if (filtreSuivi === 'alertes') return inscriptions.filter(i => aUneAlerte(i.antecedents_medicaux))
    if (filtreSuivi === 'chroniques') return inscriptions.filter(i => profilDe(i.id)?.traitement_chronique)
    return inscriptions
  }, [inscriptions, filtreSuivi, profilDe])

  const suggestionsRecherche = useMemo(() => {
    const q = rechercheConsultation.trim().toLowerCase()
    if (q.length < 2) return []
    return inscriptions.filter(i => `${i.prenoms} ${i.nom}`.toLowerCase().includes(q)).slice(0, 6)
  }, [inscriptions, rechercheConsultation])

  // Patients actuellement suivis : dernière consultation de chacun
  // indiquant un statut non-résolu (repos cabine / évacuation).
  const patientsSuivis = useMemo(() => {
    const derniereParPatient = new Map<string, Consultation>()
    for (const c of consultations) {
      const existante = derniereParPatient.get(c.inscription_id)
      if (!existante || new Date(c.created_at) > new Date(existante.created_at)) {
        derniereParPatient.set(c.inscription_id, c)
      }
    }
    return [...derniereParPatient.values()].filter(c => estEnSuivi(c.statut_sortie))
  }, [consultations])

  async function supprimerMedicament(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('pharmacie_stock').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Médicament supprimé.')
    charger()
  }

  async function supprimerConsultation(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('consultations_medicales').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Consultation supprimée.')
    charger()
  }

  function ouvrirFicheDepuisConsultation(inscriptionId: string) {
    const c = inscriptions.find(i => i.id === inscriptionId)
    if (c) setCampeurOuvert(c)
  }

  // ---- Export Excel (consultations, stock, statistiques) ----
  async function exporterExcel() {
    try {
      const { utils, writeFileXLSX } = await import('xlsx')

      const feuilleConsultations = utils.json_to_sheet(consultations.map(c => ({
        Campeur: nomCampeur(c.inscription_id), Type: c.type_entree === 'dispense_rapide' ? 'Dispense rapide' : 'Consultation',
        Motif: c.motif ?? '', 'Température': c.temperature ?? '', Tension: c.tension ?? '',
        Soins: c.description_soins ?? '', Médicament: nomMedicament(c.medicament_id), Quantité: c.quantite_distribuee ?? '',
        Statut: c.statut_sortie ?? '', Date: formatDateFr(c.created_at),
      })))

      const feuilleStock = utils.json_to_sheet(medicaments.map(m => ({
        Médicament: m.nom, 'Quantité en stock': m.quantite_stock, Unité: m.unite ?? '', "Seuil d'alerte": m.seuil_alerte ?? '',
      })))

      const parMotif = new Map<string, number>()
      consultations.forEach(c => { if (c.motif) parMotif.set(c.motif, (parMotif.get(c.motif) ?? 0) + 1) })
      const feuilleStats = utils.json_to_sheet([
        { Indicateur: 'Total consultations', Valeur: consultations.length },
        { Indicateur: 'Patients actuellement suivis', Valeur: patientsSuivis.length },
        ...[...parMotif.entries()].map(([motif, n]) => ({ Indicateur: `Motif — ${motif}`, Valeur: n })),
      ])

      const classeur = utils.book_new()
      utils.book_append_sheet(classeur, feuilleStats, 'Statistiques')
      utils.book_append_sheet(classeur, feuilleConsultations, 'Consultations')
      utils.book_append_sheet(classeur, feuilleStock, 'Stock Pharmacie')
      writeFileXLSX(classeur, `sante_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      toast.erreur("Échec de la génération — l'application va se mettre à jour, merci de réessayer ensuite.")
      recupererApresEchecChargement()
    }
  }

  // ---- Export PDF (rapport synthétique) ----
  async function exporterPDF() {
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()

      doc.setFontSize(13)
      doc.text('Mission Évangélique des Navigateurs CI', 14, 15)
      doc.setFontSize(11)
      doc.text('Rapport santé — Camp Biblique-Navs 2026', 14, 22)
      doc.setFontSize(9)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28)

      autoTable(doc, {
        startY: 35,
        head: [['Indicateur', 'Valeur']],
        body: [
          ['Total consultations', String(consultations.length)],
          ['Patients actuellement suivis', String(patientsSuivis.length)],
          ['Médicaments en stock', String(medicaments.length)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [27, 59, 26] },
      })

      autoTable(doc, {
        head: [['Campeur', 'Motif', 'Statut', 'Date']],
        body: consultations.map(c => [nomCampeur(c.inscription_id), c.motif ?? '—', c.statut_sortie ?? '—', formatDateFr(c.created_at)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [27, 59, 26] },
      })

      doc.save(`rapport_sante_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      toast.erreur("Échec de la génération — l'application va se mettre à jour, merci de réessayer ensuite.")
      recupererApresEchecChargement()
    }
  }

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }
  if (statutAcces === 'non_connecte') return <Login onConnecte={verifierAcces} />
  if (statutAcces === 'refuse') return <AccesRestreint message="Ce module est strictement réservé au comité santé et à l'administration." />

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Santé — Suivi &amp; Consultations</h1>
          <div className="flex gap-2">
            <button type="button" onClick={exporterExcel} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
              Export Excel
            </button>
            <button type="button" onClick={exporterPDF} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE]">
              Export PDF
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-x-auto">
          <div className="flex">
            {[
              { v: 'suivi' as const, l: 'Suivi des campeurs' },
              { v: 'main_courante' as const, l: 'Main courante' },
              { v: 'pharmacie' as const, l: 'Pharmacie' },
            ].map(o => (
              <button key={o.v} type="button" onClick={() => setSousEcran(o.v)}
                className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${sousEcran === o.v ? 'border-[#4F8A3D] text-[#1B3B1A] bg-[#F4F9F0]' : 'border-transparent text-gray-400 hover:text-[#1B3B1A]'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Patients actuellement suivis — visible sur tous les sous-écrans */}
        {patientsSuivis.length > 0 && (
          <section className="bg-[#D9A441]/10 border border-[#D9A441]/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-[#8A6A23]" strokeWidth={1.8} />
              <p className="text-sm font-bold text-[#8A6A23]">Patients actuellement suivis ({patientsSuivis.length})</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {patientsSuivis.map(c => (
                <button key={c.id} type="button" onClick={() => ouvrirFicheDepuisConsultation(c.inscription_id)}
                  className="text-xs font-semibold bg-white px-3 py-1.5 rounded-lg border border-[#D9A441]/40 hover:border-[#D9A441] text-[#1B3B1A]">
                  {nomCampeur(c.inscription_id)} · {c.statut_sortie}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* Sous-écran A : Suivi des campeurs */}
        {/* ============================================================ */}
        {sousEcran === 'suivi' && (
          <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
            <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#E7F2DE]">
              {[
                { v: 'tous' as const, l: 'Tous' },
                { v: 'alertes' as const, l: 'Alertes critiques' },
                { v: 'chroniques' as const, l: 'Traitements chroniques' },
              ].map(f => (
                <button key={f.v} type="button" onClick={() => { setFiltreSuivi(f.v); setPageSuivi(1) }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors duration-200 ${filtreSuivi === f.v ? 'bg-[#4F8A3D] text-white' : 'bg-[#F4F9F0] text-[#5B7A56] hover:bg-[#E7F2DE]'}`}>
                  {f.l}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Nom</th>
                    <th className="px-4 py-2.5 font-medium">Téléphone</th>
                    <th className="px-4 py-2.5 font-medium">Antécédents</th>
                    <th className="px-4 py-2.5 font-medium">Traitement chronique</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7F2DE]">
                  {chargement ? (
                    <SkeletonTableau lignes={6} colonnes={4} />
                  ) : inscriptionsFiltrees.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-5 text-center text-gray-400">Aucun campeur dans ce filtre.</td></tr>
                  ) : paginer(inscriptionsFiltrees, pageSuivi, PAR_PAGE).map(i => {
                    const profil = profilDe(i.id)
                    return (
                      <tr key={i.id} onClick={() => setCampeurOuvert(i)} className="text-[#1B3B1A] cursor-pointer hover:bg-[#F4F9F0]">
                        <td className="px-4 py-2.5 font-medium">{i.prenoms} {i.nom}</td>
                        <td className="px-4 py-2.5 text-gray-500">{i.telephone}</td>
                        <td className="px-4 py-2.5">
                          {aUneAlerte(i.antecedents_medicaux) ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#B3492F]/10 text-[#B3492F]">À noter</span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {profil?.traitement_chronique ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D9A441]/15 text-[#8A6A23]">{profil.traitement_nom || 'Oui'}</span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={pageSuivi} totalPages={Math.max(1, Math.ceil(inscriptionsFiltrees.length / PAR_PAGE))} onChange={setPageSuivi} />
          </section>
        )}

        {/* ============================================================ */}
        {/* Sous-écran B : Main courante */}
        {/* ============================================================ */}
        {sousEcran === 'main_courante' && (
          <>
            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
              <p className="text-sm font-bold text-[#1B3B1A] mb-3">Nouvelle consultation</p>

              {!campeurConsultation ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.8} />
                    <input type="text" value={rechercheConsultation} onChange={e => setRechercheConsultation(e.target.value)}
                      placeholder="Rechercher un campeur par nom..."
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
                  </div>
                  {suggestionsRecherche.length > 0 && (
                    <div className="absolute z-10 inset-x-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {suggestionsRecherche.map(i => (
                        <div key={i.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-[#F4F9F0]">
                          <button type="button" onClick={() => { setCampeurConsultation(i); setRechercheConsultation('') }}
                            className="text-sm text-[#1B3B1A] text-left flex-1">
                            {i.prenoms} {i.nom}
                          </button>
                          <button type="button" onClick={() => { setModaleDispense(i); setRechercheConsultation('') }}
                            className="text-xs font-semibold text-[#5B7A56] hover:text-[#1B3B1A] shrink-0 ml-2">
                            Dispense rapide
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <FormulaireConsultation
                  campeur={campeurConsultation}
                  medicaments={medicaments}
                  motifs={motifs}
                  statuts={statuts}
                  onAnnuler={() => setCampeurConsultation(null)}
                  onEnregistre={() => { setCampeurConsultation(null); charger() }}
                  onNouveauMotif={() => setModaleMotif(true)}
                  onNouveauStatut={() => setModaleStatut(true)}
                />
              )}
            </section>

            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
              <div className="px-5 py-3 border-b border-[#E7F2DE]">
                <p className="text-sm font-bold text-[#1B3B1A]">Historique des soins {consultations.length > 0 && `(${consultations.length})`}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Campeur</th>
                      <th className="px-4 py-2.5 font-medium">Motif</th>
                      <th className="px-4 py-2.5 font-medium">Constantes</th>
                      <th className="px-4 py-2.5 font-medium">Sortie</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7F2DE]">
                    {chargement ? (
                      <SkeletonTableau lignes={5} colonnes={6} />
                    ) : consultations.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-5 text-center text-gray-400">Aucune consultation enregistrée.</td></tr>
                    ) : paginer(consultations, pageConsultations, PAR_PAGE).map(c => {
                      const badge = badgeStatutSortie(c.statut_sortie)
                      return (
                        <tr key={c.id} className="text-[#1B3B1A]">
                          <td className="px-4 py-2.5 font-medium">
                            <button type="button" onClick={() => ouvrirFicheDepuisConsultation(c.inscription_id)} className="hover:underline text-left">
                              {nomCampeur(c.inscription_id)}
                            </button>
                          </td>
                          <td className="px-4 py-2.5 text-gray-500">{c.motif ?? (c.type_entree === 'dispense_rapide' ? 'Dispense rapide' : '—')}</td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {c.temperature ? `${c.temperature}°C` : ''}{c.temperature && c.tension ? ' · ' : ''}{c.tension ?? ''}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(c.created_at)}</td>
                          <td className="px-4 py-2.5">
                            <BoutonSupprimer id={c.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimerConsultation(c.id)} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageConsultations} totalPages={Math.max(1, Math.ceil(consultations.length / PAR_PAGE))} onChange={setPageConsultations} />
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/* Sous-écran : Pharmacie */}
        {/* ============================================================ */}
        {sousEcran === 'pharmacie' && (
          <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
              <p className="text-sm font-bold text-[#1B3B1A]">Stock pharmacie {medicaments.length > 0 && `(${medicaments.length})`}</p>
              <button type="button" onClick={() => setModaleMedicament('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                + Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Médicament</th>
                    <th className="px-4 py-2.5 font-medium">Quantité</th>
                    <th className="px-4 py-2.5 font-medium">Seuil d'alerte</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7F2DE]">
                  {chargement ? (
                    <SkeletonTableau lignes={5} colonnes={4} />
                  ) : medicaments.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-5 text-center text-gray-400">Aucun médicament enregistré.</td></tr>
                  ) : paginer(medicaments, pagePharmacie, PAR_PAGE).map(m => {
                    const enAlerte = m.seuil_alerte !== null && m.quantite_stock <= m.seuil_alerte
                    return (
                      <tr key={m.id} className="text-[#1B3B1A]">
                        <td className="px-4 py-2.5 font-medium">{m.nom}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-semibold ${enAlerte || m.quantite_stock <= 0 ? 'text-[#B3492F]' : 'text-[#4F8A3D]'}`}>
                            {m.quantite_stock} {m.unite ?? ''}
                          </span>
                          {enAlerte && <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-[#B3492F]/10 text-[#B3492F]">Stock bas</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{m.seuil_alerte ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <BoutonModifier onClick={() => setModaleMedicament(m)} />
                            <BoutonSupprimer id={m.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimerMedicament(m.id)} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={pagePharmacie} totalPages={Math.max(1, Math.ceil(medicaments.length / PAR_PAGE))} onChange={setPagePharmacie} />
          </section>
        )}
      </div>

      {campeurOuvert && (
        <FicheUrgence
          campeur={campeurOuvert}
          commissions={commissions}
          profil={profilDe(campeurOuvert.id)}
          suivi={suivi.filter(s => s.inscription_id === campeurOuvert.id)}
          consultationsPatient={consultations.filter(c => c.inscription_id === campeurOuvert.id)}
          nomMedicament={nomMedicament}
          onFermer={() => setCampeurOuvert(null)}
          onMaj={charger}
        />
      )}
      {modaleMedicament && (
        <ModaleMedicament
          donnee={modaleMedicament === 'nouveau' ? null : modaleMedicament}
          onFermer={() => setModaleMedicament(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleMotif && (
        <ModaleOptionListe table="motifs_consultation" titre="Ajouter un motif" placeholder="Ex : Otite"
          onFermer={() => setModaleMotif(false)} onSauvegarde={charger} />
      )}
      {modaleStatut && (
        <ModaleOptionListe table="statuts_sortie" titre="Ajouter un statut de sortie" placeholder="Ex : Transfert clinique"
          onFermer={() => setModaleStatut(false)} onSauvegarde={charger} />
      )}
      {modaleDispense && (
        <ModaleDispenseRapide
          campeur={modaleDispense}
          medicaments={medicaments}
          onFermer={() => setModaleDispense(null)}
          onEnregistre={() => { setModaleDispense(null); charger() }}
        />
      )}
    </div>
  )
}

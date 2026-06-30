import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatFCFA, formatDateFr } from '../utils/format'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, CarteKPI, paginer } from './ComposantsTableau'
import { SkeletonCarteKPI } from './Skeleton'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Trésorerie & Commissions (Phase 8)
// Architecture : les "Donateurs", "Boutique" et "Autres revenus"
// écrivent dans la table "tresorerie" existante (avec leur propre
// catégorie) plutôt que dans des tables séparées, pour que le solde
// global reste calculable en une seule somme, comme avant.
// Les "Dons en nature" restent dans leur table dédiée (ce n'est pas
// du cash). "Frais de participation" est désormais calculé à partir
// de la table "versements" — il n'est plus saisi manuellement ici.
// ============================================================

const ROLES_TRESORERIE = ['admin', 'comite_treso'] as const
const PAR_PAGE = 10

const UNITES = ['kg', 'litre', 'carton', 'sac', 'boite', 'pieces', 'unites']

// ---- Types ----
interface Commission {
  id: string
  nom: string
  nom_responsable: string | null
  telephone_responsable: string | null
  budget_initial: number
  budget_reel_decaissable: number
  cumul_depenses: number
  solde_restant: number
}

interface LigneTresorerie {
  id: string
  type: 'entree' | 'sortie'
  categorie: string
  nom_partie: string | null
  detail: string
  montant: number
  date_mouvement: string
  commission_id: string | null
  quantite: number | null
  prix_unitaire: number | null
  justificatif_numero: string | null
}

interface DonNature {
  id: string
  designation: string | null
  quantite: number | null
  unite: string | null
  type_donateur: string | null
  nom_donateur: string | null
  commission_id: string | null
  valeur_estimee: number
  date_reception: string
}

interface Resume {
  total_ressources_reelles: number
  total_sorties: number
  objectif_budget: number
  total_frais_participation: number
}

const champBase = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent'
const labelBase = 'block text-sm font-medium text-[#1B3B1A] mb-1'

// ============================================================
// Modale : Commission (ajout / édition)
// ============================================================
function ModaleCommission({ donnee, onFermer, onSauvegarde }: {
  donnee: Commission | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [nom, setNom] = useState(donnee?.nom ?? '')
  const [responsable, setResponsable] = useState(donnee?.nom_responsable ?? '')
  const [telephone, setTelephone] = useState(donnee?.telephone_responsable ?? '')
  const [budget, setBudget] = useState(donnee ? String(donnee.budget_initial) : '')
  const [envoi, setEnvoi] = useState(false)

  const valide = nom.trim() !== '' && budget !== '' && Number(budget) >= 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      nom: nom.trim(),
      nom_responsable: responsable.trim() || null,
      telephone_responsable: telephone.trim() || null,
      budget_initial: Number(budget),
    }
    const { error } = donnee
      ? await supabase.from('commissions').update(payload).eq('id', donnee.id)
      : await supabase.from('commissions').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Commission mise à jour !' : 'Commission ajoutée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la commission' : 'Ajouter une commission'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Nom de la commission</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} className={champBase} placeholder="Ex : Logistique" />
        </div>
        <div>
          <label className={labelBase}>Nom du responsable</label>
          <input type="text" value={responsable} onChange={e => setResponsable(e.target.value)} className={champBase} placeholder="Ex : Jean Koffi" />
        </div>
        <div>
          <label className={labelBase}>Téléphone du responsable</label>
          <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={champBase} placeholder="Ex : 07 00 00 00 00" />
        </div>
        <div>
          <label className={labelBase}>Budget initial alloué (F CFA)</label>
          <input type="number" min={0} value={budget} onChange={e => setBudget(e.target.value)} className={champBase} placeholder="Ex : 500000" />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : Don en nature (ajout / édition)
// ============================================================
function ModaleDonNature({ donnee, commissions, onFermer, onSauvegarde }: {
  donnee: DonNature | null
  commissions: Commission[]
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [designation, setDesignation] = useState(donnee?.designation ?? '')
  const [quantite, setQuantite] = useState(donnee ? String(donnee.quantite ?? '') : '')
  const [unite, setUnite] = useState(donnee?.unite ?? '')
  const [typeDonateur, setTypeDonateur] = useState(donnee?.type_donateur ?? '')
  const [nomDonateur, setNomDonateur] = useState(donnee?.nom_donateur ?? '')
  const [commissionId, setCommissionId] = useState(donnee?.commission_id ?? '')
  const [valeur, setValeur] = useState(donnee ? String(donnee.valeur_estimee) : '')
  const [date, setDate] = useState(donnee ? donnee.date_reception.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [envoi, setEnvoi] = useState(false)

  const valide = designation.trim() !== '' && quantite !== '' && unite !== '' && typeDonateur !== '' && nomDonateur.trim() !== '' && valeur !== '' && Number(valeur) >= 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      designation: designation.trim(),
      quantite: Number(quantite),
      unite,
      type_donateur: typeDonateur,
      nom_donateur: nomDonateur.trim(),
      commission_id: commissionId || null,
      valeur_estimee: Number(valeur),
      date_reception: date,
    }
    const { error } = donnee
      ? await supabase.from('dons_nature').update(payload).eq('id', donnee.id)
      : await supabase.from('dons_nature').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); console.error(error); return }
    toast.succes(donnee ? 'Don en nature mis à jour !' : 'Don en nature ajouté !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le don en nature' : 'Ajouter un don en nature'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Désignation</label>
          <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className={champBase} placeholder="Ex : Riz" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>Quantité</label>
            <input type="number" min={0} value={quantite} onChange={e => setQuantite(e.target.value)} className={champBase} placeholder="Ex : 10" />
          </div>
          <div>
            <label className={labelBase}>Unité</label>
            <select value={unite} onChange={e => setUnite(e.target.value)} className={`${champBase} bg-white`}>
              <option value="">Sélectionner...</option>
              {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelBase}>Type de donateur</label>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: 'navs', l: 'Navs' }, { v: 'non_navs', l: 'Non-Navs' }].map(opt => (
              <button key={opt.v} type="button" onClick={() => setTypeDonateur(opt.v)}
                className={`rounded-lg border-2 py-2 text-sm font-semibold ${typeDonateur === opt.v ? 'border-[#4F8A3D] bg-[#E7F2DE] text-[#1B3B1A]' : 'border-gray-200 text-gray-500'}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelBase}>Nom du donateur</label>
          <input type="text" value={nomDonateur} onChange={e => setNomDonateur(e.target.value)} className={champBase} placeholder="Ex : Famille Kouassi" />
        </div>
        <div>
          <label className={labelBase}>Commission bénéficiaire</label>
          <select value={commissionId} onChange={e => setCommissionId(e.target.value)} className={`${champBase} bg-white`}>
            <option value="">Général / Tout le camp</option>
            {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div>
          <label className={labelBase}>Valeur estimée (F CFA)</label>
          <input type="number" min={0} value={valeur} onChange={e => setValeur(e.target.value)} className={champBase} placeholder="Ex : 50000" />
        </div>
        <div>
          <label className={labelBase}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champBase} />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : Donateur (Navs & Non-Navs) — ajout / édition
// ============================================================
function ModaleDonateur({ donnee, onFermer, onSauvegarde }: {
  donnee: LigneTresorerie | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [nom, setNom] = useState(donnee?.nom_partie ?? '')
  const [type, setType] = useState(donnee?.categorie === 'don_externe' ? 'non_navs' : 'membre_navs')
  const [description, setDescription] = useState(donnee?.detail ?? '')
  const [montant, setMontant] = useState(donnee ? String(donnee.montant) : '')
  const [date, setDate] = useState(donnee ? donnee.date_mouvement.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [envoi, setEnvoi] = useState(false)

  const valide = nom.trim() !== '' && montant !== '' && Number(montant) > 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      type: 'entree' as const,
      categorie: type === 'membre_navs' ? 'don_interne' : 'don_externe',
      nom_partie: nom.trim(),
      detail: description.trim(),
      montant: Number(montant),
      date_mouvement: date,
    }
    const { error } = donnee
      ? await supabase.from('tresorerie').update(payload).eq('id', donnee.id)
      : await supabase.from('tresorerie').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); console.error(error); return }
    toast.succes(donnee ? 'Don mis à jour !' : 'Don enregistré !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le don' : 'Ajouter un donateur'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Nom du donateur</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} className={champBase} placeholder="Ex : Marie Koffi" />
        </div>
        <div>
          <label className={labelBase}>Type</label>
          <div className="grid grid-cols-2 gap-3">
            {[{ v: 'membre_navs', l: 'Membre Navs' }, { v: 'non_navs', l: 'Contact Non-Navs' }].map(opt => (
              <button key={opt.v} type="button" onClick={() => setType(opt.v)}
                className={`rounded-lg border-2 py-2 text-sm font-semibold ${type === opt.v ? 'border-[#4F8A3D] bg-[#E7F2DE] text-[#1B3B1A]' : 'border-gray-200 text-gray-500'}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelBase}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={champBase} placeholder="Ex : Don pour le transport" />
        </div>
        <div>
          <label className={labelBase}>Montant (F CFA)</label>
          <input type="number" min={1} value={montant} onChange={e => setMontant(e.target.value)} className={champBase} placeholder="Ex : 25000" />
        </div>
        <div>
          <label className={labelBase}>Date de réception</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champBase} />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : Boutique du camp — ajout / édition
// ============================================================
function ModaleBoutique({ donnee, onFermer, onSauvegarde }: {
  donnee: LigneTresorerie | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [acheteur, setAcheteur] = useState(donnee?.nom_partie ?? '')
  const [designation, setDesignation] = useState(donnee?.detail ?? '')
  const [quantite, setQuantite] = useState(donnee ? String(donnee.quantite ?? '') : '')
  const [prixUnitaire, setPrixUnitaire] = useState(donnee ? String(donnee.prix_unitaire ?? '') : '')
  const [date, setDate] = useState(donnee ? donnee.date_mouvement.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [envoi, setEnvoi] = useState(false)

  const montantTotal = (Number(quantite) || 0) * (Number(prixUnitaire) || 0)
  const valide = acheteur.trim() !== '' && designation.trim() !== '' && Number(quantite) > 0 && Number(prixUnitaire) > 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      type: 'entree' as const,
      categorie: 'vente_gadgets',
      nom_partie: acheteur.trim(),
      detail: designation.trim(),
      montant: montantTotal,
      quantite: Number(quantite),
      prix_unitaire: Number(prixUnitaire),
      date_mouvement: date,
    }
    const { error } = donnee
      ? await supabase.from('tresorerie').update(payload).eq('id', donnee.id)
      : await supabase.from('tresorerie').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); console.error(error); return }
    toast.succes(donnee ? 'Vente mise à jour !' : 'Vente enregistrée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la vente' : 'Ajouter une vente (Boutique)'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Nom de l'acheteur</label>
          <input type="text" value={acheteur} onChange={e => setAcheteur(e.target.value)} className={champBase} placeholder="Ex : Paul N'Guessan" />
        </div>
        <div>
          <label className={labelBase}>Désignation de l'article</label>
          <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className={champBase} placeholder="Ex : Polo taille M" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>Quantité</label>
            <input type="number" min={1} value={quantite} onChange={e => setQuantite(e.target.value)} className={champBase} placeholder="Ex : 2" />
          </div>
          <div>
            <label className={labelBase}>Prix unitaire (F CFA)</label>
            <input type="number" min={1} value={prixUnitaire} onChange={e => setPrixUnitaire(e.target.value)} className={champBase} placeholder="Ex : 5000" />
          </div>
        </div>
        <div className="bg-[#F4F9F0] rounded-lg px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-[#5B7A56] font-medium">Montant total</span>
          <span className="text-sm font-bold text-[#1B3B1A]">{formatFCFA(montantTotal)}</span>
        </div>
        <div>
          <label className={labelBase}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champBase} />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : Autres revenus & solde antérieur — ajout / édition
// ============================================================
function ModaleAutreRevenu({ donnee, onFermer, onSauvegarde }: {
  donnee: LigneTresorerie | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [source, setSource] = useState(donnee?.nom_partie ?? '')
  const [description, setDescription] = useState(donnee?.detail ?? '')
  const [montant, setMontant] = useState(donnee ? String(donnee.montant) : '')
  const [date, setDate] = useState(donnee ? donnee.date_mouvement.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [envoi, setEnvoi] = useState(false)

  const valide = source.trim() !== '' && montant !== '' && Number(montant) > 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      type: 'entree' as const,
      categorie: 'autre',
      nom_partie: source.trim(),
      detail: description.trim(),
      montant: Number(montant),
      date_mouvement: date,
    }
    const { error } = donnee
      ? await supabase.from('tresorerie').update(payload).eq('id', donnee.id)
      : await supabase.from('tresorerie').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); console.error(error); return }
    toast.succes(donnee ? 'Revenu mis à jour !' : 'Revenu enregistré !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le revenu' : 'Ajouter un autre revenu'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Source du revenu</label>
          <input type="text" value={source} onChange={e => setSource(e.target.value)} className={champBase} placeholder="Ex : Solde antérieur" />
        </div>
        <div>
          <label className={labelBase}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} className={champBase} placeholder="Ex : Reliquat du camp 2025" />
        </div>
        <div>
          <label className={labelBase}>Montant (F CFA)</label>
          <input type="number" min={1} value={montant} onChange={e => setMontant(e.target.value)} className={champBase} placeholder="Ex : 100000" />
        </div>
        <div>
          <label className={labelBase}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champBase} />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Modale : Dépense (toujours liée à une commission) — ajout / édition
// ============================================================
// ============================================================
// Modale : Subvention du Ministère REÇUE — uniquement quand l'argent
// est effectivement décaissé (jamais l'estimation automatique).
// ============================================================
function ModaleSubvention({ donnee, onFermer, onSauvegarde }: {
  donnee: LigneTresorerie | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [montant, setMontant] = useState(donnee ? String(donnee.montant) : '')
  const [reference, setReference] = useState(donnee?.detail ?? '')
  const [date, setDate] = useState(donnee ? donnee.date_mouvement.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [envoi, setEnvoi] = useState(false)

  const valide = montant !== '' && Number(montant) > 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      type: 'entree' as const,
      categorie: 'subvention',
      nom_partie: 'Ministère',
      detail: reference.trim(),
      montant: Number(montant),
      date_mouvement: date,
    }
    const { error } = donnee
      ? await supabase.from('tresorerie').update(payload).eq('id', donnee.id)
      : await supabase.from('tresorerie').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); console.error(error); return }
    toast.succes(donnee ? 'Subvention mise à jour !' : 'Subvention enregistrée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la subvention reçue' : 'Enregistrer une subvention reçue'} onFermer={onFermer}>
      <div className="space-y-3">
        <p className="text-xs text-[#8A6A23] bg-[#D9A441]/10 rounded-lg px-3 py-2">
          À utiliser uniquement lorsque le ministère a effectivement versé les fonds — pas pour l'estimation automatique.
        </p>
        <div>
          <label className={labelBase}>Montant reçu (F CFA)</label>
          <input type="number" min={1} value={montant} onChange={e => setMontant(e.target.value)} className={champBase} placeholder="Ex : 500000" />
        </div>
        <div>
          <label className={labelBase}>Référence / Note (optionnel)</label>
          <input type="text" value={reference} onChange={e => setReference(e.target.value)} className={champBase} placeholder="Ex : Virement du 20 août" />
        </div>
        <div>
          <label className={labelBase}>Date de réception</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champBase} />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

function ModaleDepense({ donnee, commissions, onFermer, onSauvegarde }: {
  donnee: LigneTresorerie | null
  commissions: Commission[]
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [commissionId, setCommissionId] = useState(donnee?.commission_id ?? '')
  const [libelle, setLibelle] = useState(donnee?.detail ?? '')
  const [montant, setMontant] = useState(donnee ? String(donnee.montant) : '')
  const [date, setDate] = useState(donnee ? donnee.date_mouvement.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [justificatif, setJustificatif] = useState(donnee?.justificatif_numero ?? '')
  const [envoi, setEnvoi] = useState(false)

  const valide = commissionId !== '' && libelle.trim() !== '' && montant !== '' && Number(montant) > 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      type: 'sortie' as const,
      categorie: 'autre',
      commission_id: commissionId,
      detail: libelle.trim(),
      montant: Number(montant),
      date_mouvement: date,
      justificatif_numero: justificatif.trim() || null,
    }
    const { error } = donnee
      ? await supabase.from('tresorerie').update(payload).eq('id', donnee.id)
      : await supabase.from('tresorerie').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Dépense mise à jour !' : 'Dépense enregistrée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la dépense' : 'Ajouter une dépense'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Commission concernée</label>
          <select value={commissionId} onChange={e => setCommissionId(e.target.value)} className={`${champBase} bg-white`}>
            <option value="">Sélectionner une commission...</option>
            {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
        <div>
          <label className={labelBase}>Libellé</label>
          <input type="text" value={libelle} onChange={e => setLibelle(e.target.value)} className={champBase} placeholder="Ex : Achat de gaz" />
        </div>
        <div>
          <label className={labelBase}>Montant décaissé (F CFA)</label>
          <input type="number" min={1} value={montant} onChange={e => setMontant(e.target.value)} className={champBase} placeholder="Ex : 30000" />
        </div>
        <div>
          <label className={labelBase}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={champBase} />
        </div>
        <div>
          <label className={labelBase}>Numéro de facture / justificatif (optionnel)</label>
          <input type="text" value={justificatif} onChange={e => setJustificatif(e.target.value)} className={champBase} placeholder="Ex : FA-2026-0042" />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white mt-2 ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

// ============================================================
// Composant principal
// ============================================================
export default function TresorerieDashboard() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_TRESORERIE)
  const toast = useToast()

  const [onglet, setOnglet] = useState<'synthese' | 'commissions' | 'mobilisation' | 'dons'>('synthese')

  const [resume, setResume] = useState<Resume | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [lignesTresorerie, setLignesTresorerie] = useState<LigneTresorerie[]>([])
  const [donsNature, setDonsNature] = useState<DonNature[]>([])
  const [fraisParCategorie, setFraisParCategorie] = useState<{ categorie: string; total: number }[]>([])
  const [chargement, setChargement] = useState(true)

  const [budgetGlobalSaisie, setBudgetGlobalSaisie] = useState('')
  const [budgetGlobalModifie, setBudgetGlobalModifie] = useState(false)
  const [envoiBudget, setEnvoiBudget] = useState(false)

  const [pageCommissions, setPageCommissions] = useState(1)
  const [pageMobilisation, setPageMobilisation] = useState(1)
  const [pageDons, setPageDons] = useState(1)
  const [pageDepenses, setPageDepenses] = useState(1)

  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  // Modales : chaque entrée null = fermée ; "nouveau" = ouverte en mode ajout
  const [modaleCommission, setModaleCommission] = useState<Commission | 'nouveau' | null>(null)
  const [modaleDonNature, setModaleDonNature] = useState<DonNature | 'nouveau' | null>(null)
  const [modaleDonateur, setModaleDonateur] = useState<LigneTresorerie | 'nouveau' | null>(null)
  const [modaleBoutique, setModaleBoutique] = useState<LigneTresorerie | 'nouveau' | null>(null)
  const [modaleAutreRevenu, setModaleAutreRevenu] = useState<LigneTresorerie | 'nouveau' | null>(null)
  const [modaleSubvention, setModaleSubvention] = useState<LigneTresorerie | 'nouveau' | null>(null)
  const [modaleDepense, setModaleDepense] = useState<LigneTresorerie | 'nouveau' | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resResume, resCommissions, resTresorerie, resDons, resFraisCategorie] = await Promise.all([
      supabase.rpc('get_resume_tresorerie'),
      supabase.from('vue_commissions_budget').select('*').order('nom'),
      supabase.from('tresorerie').select('*').order('date_mouvement', { ascending: false }),
      supabase.from('dons_nature').select('*').order('date_reception', { ascending: false }),
      supabase.rpc('get_frais_participation_par_categorie'),
    ])
    if (resResume.data && resResume.data.length > 0) {
      const r = resResume.data[0] as Resume
      setResume(r)
      if (!budgetGlobalModifie) setBudgetGlobalSaisie(String(r.objectif_budget ?? 0))
    }
    if (resCommissions.data) setCommissions(resCommissions.data as Commission[])
    if (resTresorerie.data) setLignesTresorerie(resTresorerie.data as LigneTresorerie[])
    if (resDons.data) setDonsNature(resDons.data as DonNature[])
    if (resFraisCategorie.data) setFraisParCategorie(resFraisCategorie.data as { categorie: string; total: number }[])
    setChargement(false)
  }, [budgetGlobalModifie])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutAcces])

  // ---- Logique Budget Global & Subvention ----
  // "total_ressources_reelles" inclut TOUTE entrée réellement saisie,
  // y compris une éventuelle subvention déjà reçue (catégorie "subvention").
  // L'estimation ci-dessous (subventionEstimee) est purement informative :
  // elle n'est JAMAIS ajoutée au solde réel, qui ne reflète que de
  // l'argent effectivement encaissé.
  const totalRessourcesReelles = resume?.total_ressources_reelles ?? 0
  const objectifBudget = resume?.objectif_budget ?? 0
  const subventionEstimee = Math.max(0, objectifBudget - totalRessourcesReelles)
  const totalSorties = resume?.total_sorties ?? 0
  const soldeReel = totalRessourcesReelles - totalSorties
  const tauxAtteinteReel = objectifBudget > 0 ? (totalRessourcesReelles / objectifBudget) * 100 : 0

  async function enregistrerBudgetGlobal() {
    const valeur = Number(budgetGlobalSaisie)
    if (!Number.isFinite(valeur) || valeur < 0) { toast.erreur('Montant invalide.'); return }
    setEnvoiBudget(true)
    const { error } = await supabase.from('parametres_camp').update({ valeur }).eq('cle', 'budget_global')
    setEnvoiBudget(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Budget global mis à jour !')
    setBudgetGlobalModifie(false)
    charger()
  }

  // "Mobilisation des fonds" couvre Donateurs/Boutique/Autres revenus/
  // Subvention reçue — les Dons en nature ont leur propre onglet.
  const mobilisationLignes = useMemo(
    () => lignesTresorerie.filter(l => l.type === 'entree' && l.categorie !== 'participation'),
    [lignesTresorerie]
  )
  const depensesLignes = useMemo(() => lignesTresorerie.filter(l => l.type === 'sortie'), [lignesTresorerie])

  // Détail des recettes réelles, ligne par ligne plutôt qu'un seul
  // total combiné — chaque catégorie est sommée séparément à partir
  // des lignes déjà chargées en mémoire.
  const detailRecettes = useMemo(() => {
    const sommeParCategorie = (categories: string[]) =>
      mobilisationLignes.filter(l => categories.includes(l.categorie)).reduce((s, l) => s + l.montant, 0)
    return {
      dons: sommeParCategorie(['don_interne', 'don_externe']),
      boutique: sommeParCategorie(['vente_gadgets']),
      subvention: sommeParCategorie(['subvention']),
      autresRevenus: sommeParCategorie(['autre']),
    }
  }, [mobilisationLignes])

  const valeurDonsNature = useMemo(
    () => donsNature.reduce((s, d) => s + (d.valeur_estimee ?? 0), 0),
    [donsNature]
  )

  function fraisDe(categorie: string): number {
    return fraisParCategorie.find(f => f.categorie === categorie)?.total ?? 0
  }

  async function supprimer(table: 'commissions' | 'tresorerie' | 'dons_nature', id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Supprimé avec succès.')
    charger()
  }

  function nomCommission(id: string | null): string {
    if (!id) return 'Général / Tout le camp'
    return commissions.find(c => c.id === id)?.nom ?? '—'
  }

  function libelleCategorieMobilisation(cat: string): string {
    if (cat === 'don_interne') return 'Don (Membre Navs)'
    if (cat === 'don_externe') return 'Don (Non-Navs)'
    if (cat === 'vente_gadgets') return 'Boutique'
    if (cat === 'subvention') return 'Subvention reçue'
    return 'Autre revenu'
  }

  // ---- Export Excel consolidé (5 feuilles, données complètes) ----
  async function exporterExcel() {
    try {
      const { utils, writeFileXLSX } = await import('xlsx')

      const feuilleSynthese = utils.json_to_sheet([{
        'Budget Global Prévu (F CFA)': objectifBudget,
        'Frais de participation (F CFA)': resume?.total_frais_participation ?? 0,
        'dont Enfant/Ado (F CFA)': fraisDe('Enfant/Ado 15-'),
        'dont Jeune/Adulte (F CFA)': fraisDe('Adulte/Ado 16+'),
        'Dons (F CFA)': detailRecettes.dons,
        'Boutique (F CFA)': detailRecettes.boutique,
        'Subvention reçue (F CFA)': detailRecettes.subvention,
        'Autres revenus (F CFA)': detailRecettes.autresRevenus,
        'Total entrées réelles (F CFA)': totalRessourcesReelles,
        'Total sorties (F CFA)': totalSorties,
        'Solde réel (F CFA)': soldeReel,
        "Taux d'atteinte réel (%)": Math.round(tauxAtteinteReel * 10) / 10,
        'Subvention estimée non reçue (F CFA)': subventionEstimee,
        'Valeur des dons en nature — hors trésorerie (F CFA)': valeurDonsNature,
      }])

      const { data: inscriptions } = await supabase
        .from('inscriptions')
        .select('nom,prenoms,categorie,telephone,montant_du,montant_paye,reduction_accordee,date_inscription')
      const feuilleInscriptions = utils.json_to_sheet(
        (inscriptions ?? []).map((i: any) => ({
          Nom: i.nom, Prénoms: i.prenoms, Catégorie: i.categorie, Téléphone: i.telephone,
          'Montant dû': i.montant_du, 'Montant payé': i.montant_paye, Réduction: i.reduction_accordee,
          Date: formatDateFr(i.date_inscription),
        }))
      )

      const feuilleMobilisation = utils.json_to_sheet(
        mobilisationLignes.map(l => ({
          Type: libelleCategorieMobilisation(l.categorie), Détail: l.detail, Montant: l.montant, Date: formatDateFr(l.date_mouvement),
        }))
      )

      const feuilleDons = utils.json_to_sheet(
        donsNature.map(d => ({
          Désignation: d.designation, Quantité: d.quantite, Unité: d.unite, 'Type donateur': d.type_donateur,
          Donateur: d.nom_donateur, Commission: nomCommission(d.commission_id), 'Valeur estimée': d.valeur_estimee,
          Date: formatDateFr(d.date_reception),
        }))
      )

      const feuilleCommissions = utils.json_to_sheet(
        commissions.map(c => ({
          Commission: c.nom, Responsable: c.nom_responsable, Téléphone: c.telephone_responsable,
          'Budget initial': c.budget_initial, 'Budget réel décaissable': c.budget_reel_decaissable,
          'Cumul dépenses': c.cumul_depenses, 'Solde restant': c.solde_restant,
        }))
      )

      const classeur = utils.book_new()
      utils.book_append_sheet(classeur, feuilleSynthese, 'Synthèse Budgétaire')
      utils.book_append_sheet(classeur, feuilleInscriptions, 'Registre Inscriptions')
      utils.book_append_sheet(classeur, feuilleMobilisation, 'Mobilisation des Fonds')
      utils.book_append_sheet(classeur, feuilleDons, 'Dons en Nature')
      utils.book_append_sheet(classeur, feuilleCommissions, 'Suivi des Commissions')
      writeFileXLSX(classeur, `tresorerie_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch {
      // Échec probable du chargement d'un module technique après une mise
      // à jour de l'application en arrière-plan. Un rechargement récupère
      // automatiquement la version à jour, sans manipulation manuelle.
      toast.erreur("Échec de la génération — l'application va se recharger, merci de réessayer ensuite.")
      setTimeout(() => window.location.reload(), 1500)
    }
  }

  // ---- Export PDF (rapport financier consolidé) ----
  async function exporterPDF() {
    try {
      const { default: jsPDF } = await import('jspdf')
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF()

      doc.setFontSize(13)
      doc.text('Mission Évangélique des Navigateurs CI', 14, 15)
      doc.setFontSize(11)
      doc.text('Rapport financier — Camp Biblique-Navs 2026', 14, 22)
      doc.setFontSize(9)
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28)

      autoTable(doc, {
        startY: 35,
        head: [['Indicateur', 'Montant']],
        body: [
          ['Budget Global Prévu', formatFCFA(objectifBudget)],
          ['Frais de participation', formatFCFA(resume?.total_frais_participation ?? 0)],
          ['  dont Enfant/Ado', formatFCFA(fraisDe('Enfant/Ado 15-'))],
          ['  dont Jeune/Adulte', formatFCFA(fraisDe('Adulte/Ado 16+'))],
          ['Dons', formatFCFA(detailRecettes.dons)],
          ['Boutique', formatFCFA(detailRecettes.boutique)],
          ['Subvention reçue', formatFCFA(detailRecettes.subvention)],
          ['Autres revenus', formatFCFA(detailRecettes.autresRevenus)],
          ['Total entrées réelles', formatFCFA(totalRessourcesReelles)],
          ['Total sorties', formatFCFA(totalSorties)],
          ['Solde réel', formatFCFA(soldeReel)],
          ['Subvention estimée non reçue', formatFCFA(subventionEstimee)],
          ['Valeur des dons en nature (hors trésorerie)', formatFCFA(valeurDonsNature)],
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [27, 59, 26] },
      })

      autoTable(doc, {
        head: [['Commission', 'Budget réel', 'Dépenses', 'Solde restant']],
        body: commissions.map(c => [c.nom, formatFCFA(c.budget_reel_decaissable), formatFCFA(c.cumul_depenses), formatFCFA(c.solde_restant)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [27, 59, 26] },
      })

      doc.save(`rapport_financier_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch {
      toast.erreur("Échec de la génération — l'application va se recharger, merci de réessayer ensuite.")
      setTimeout(() => window.location.reload(), 1500)
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
  if (statutAcces === 'refuse') return <AccesRestreint message="Ce module est réservé à l'équipe trésorerie." />

  const ONGLETS: { cle: typeof onglet; label: string }[] = [
    { cle: 'synthese', label: 'Synthèse Globale & Budget' },
    { cle: 'commissions', label: `Commissions (${commissions.length})` },
    { cle: 'mobilisation', label: 'Mobilisation des Fonds' },
    { cle: 'dons', label: 'Dons en Nature' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Trésorerie &amp; Commissions</h1>
          <div className="flex gap-2">
            <button type="button" onClick={exporterExcel} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
              Export Excel consolidé
            </button>
            <button type="button" onClick={exporterPDF} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE]">
              Export PDF
            </button>
          </div>
        </div>

        {/* Onglets horizontaux */}
        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-x-auto">
          <div className="flex">
            {ONGLETS.map(o => (
              <button
                key={o.cle}
                type="button"
                onClick={() => setOnglet(o.cle)}
                className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${
                  onglet === o.cle ? 'border-[#4F8A3D] text-[#1B3B1A] bg-[#F4F9F0]' : 'border-transparent text-gray-400 hover:text-[#1B3B1A]'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============================================================ */}
        {/* Onglet 1 — Synthèse Globale & Budget */}
        {/* ============================================================ */}
        {onglet === 'synthese' && (
          <>
            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
              <p className="text-sm font-bold text-[#1B3B1A] mb-3">Budget Global Prévu</p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={budgetGlobalSaisie}
                  onChange={e => { setBudgetGlobalSaisie(e.target.value); setBudgetGlobalModifie(true) }}
                  className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
                  placeholder="Ex : 5000000"
                />
                <button
                  type="button"
                  onClick={enregistrerBudgetGlobal}
                  disabled={envoiBudget}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] disabled:bg-gray-300"
                >
                  {envoiBudget ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <span className="text-xs text-gray-400">Sert de référence pour le calcul automatique de la subvention du ministère.</span>
              </div>
            </section>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {chargement ? (
                <>
                  <SkeletonCarteKPI /><SkeletonCarteKPI /><SkeletonCarteKPI /><SkeletonCarteKPI />
                </>
              ) : (
                <>
                  <CarteKPI label="Solde réel de trésorerie" valeur={formatFCFA(soldeReel)} accent="text-[#4F8A3D]" />
                  <CarteKPI label="Total entrées réelles" valeur={formatFCFA(totalRessourcesReelles)} />
                  <CarteKPI label="Total sorties" valeur={formatFCFA(totalSorties)} accent="text-[#B3492F]" />
                  <CarteKPI label="Taux d'atteinte réel" valeur={`${Math.round(tauxAtteinteReel * 10) / 10}%`} accent="text-[#D9A441]" />
                </>
              )}
            </div>

            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
              <p className="text-sm font-bold text-[#1B3B1A] mb-3">Détail des recettes réelles</p>
              <div className="divide-y divide-[#E7F2DE] text-sm">
                <div className="py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Frais de participation (versements campeurs)</span>
                    <span className="font-medium text-[#1B3B1A]">{formatFCFA(resume?.total_frais_participation ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between pl-4 mt-1">
                    <span className="text-xs text-gray-400">dont Enfant/Ado</span>
                    <span className="text-xs text-gray-500">{formatFCFA(fraisDe('Enfant/Ado 15-'))}</span>
                  </div>
                  <div className="flex items-center justify-between pl-4">
                    <span className="text-xs text-gray-400">dont Jeune/Adulte</span>
                    <span className="text-xs text-gray-500">{formatFCFA(fraisDe('Adulte/Ado 16+'))}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-gray-500">Dons</span>
                  <span className="font-medium text-[#1B3B1A]">{formatFCFA(detailRecettes.dons)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-gray-500">Boutique</span>
                  <span className="font-medium text-[#1B3B1A]">{formatFCFA(detailRecettes.boutique)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-gray-500">Subvention reçue</span>
                  <span className="font-medium text-[#1B3B1A]">{formatFCFA(detailRecettes.subvention)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-gray-500">Autres revenus</span>
                  <span className="font-medium text-[#1B3B1A]">{formatFCFA(detailRecettes.autresRevenus)}</span>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <span className="font-bold text-[#1B3B1A]">Total entrées réelles</span>
                  <span className="font-bold text-[#1B3B1A]">{formatFCFA(totalRessourcesReelles)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2.5 mt-2 border-t border-dashed border-[#E7F2DE] text-sm">
                <span className="text-gray-400 italic">Valeur des dons en nature (hors trésorerie, non comptée ci-dessus)</span>
                <span className="text-gray-500 italic">{formatFCFA(valeurDonsNature)}</span>
              </div>
            </section>

            <section className={`rounded-2xl border shadow-sm p-5 ${subventionEstimee > 0 ? 'bg-[#D9A441]/10 border-[#D9A441]/40' : 'bg-white border-[#E7F2DE]'}`}>
              <p className="text-sm font-bold text-[#1B3B1A] mb-2">Estimation — Subvention du Ministère</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Écart entre le budget prévu et les recettes réelles</span>
                <span className={`text-lg font-bold ${subventionEstimee > 0 ? 'text-[#8A6A23]' : 'text-gray-400'}`}>{formatFCFA(subventionEstimee)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {subventionEstimee > 0
                  ? "Ceci est une simple estimation du besoin, pas de l'argent en caisse. Le solde réel ci-dessus n'en tient pas compte. Une fois la subvention effectivement reçue, enregistre-la via le bouton « + Subvention reçue » de l'onglet Mobilisation des fonds."
                  : 'Le budget prévu est déjà couvert par les recettes réelles : aucune subvention nécessaire pour le moment.'}
              </p>
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/* Onglet 2 — 17 Commissions (budgets + dépenses) */}
        {/* ============================================================ */}
        {onglet === 'commissions' && (
          <>
            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
                <p className="text-sm font-bold text-[#1B3B1A]">Commissions</p>
                <button type="button" onClick={() => setModaleCommission('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                  + Ajouter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Commission</th>
                      <th className="px-4 py-2.5 font-medium">Responsable</th>
                      <th className="px-4 py-2.5 font-medium">Téléphone</th>
                      <th className="px-4 py-2.5 font-medium">Budget initial</th>
                      <th className="px-4 py-2.5 font-medium">Budget réel</th>
                      <th className="px-4 py-2.5 font-medium">Dépenses</th>
                      <th className="px-4 py-2.5 font-medium">Solde restant</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7F2DE]">
                    {commissions.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-5 text-center text-gray-400">Aucune commission enregistrée.</td></tr>
                    ) : paginer(commissions, pageCommissions, PAR_PAGE).map(c => (
                      <tr key={c.id} className="text-[#1B3B1A]">
                        <td className="px-4 py-2.5 font-medium">{c.nom}</td>
                        <td className="px-4 py-2.5 text-gray-500">{c.nom_responsable ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {c.telephone_responsable ? <a href={`tel:+225${c.telephone_responsable}`} className="text-[#4F8A3D] hover:underline">{c.telephone_responsable}</a> : '—'}
                        </td>
                        <td className="px-4 py-2.5">{formatFCFA(c.budget_initial)}</td>
                        <td className="px-4 py-2.5">{formatFCFA(c.budget_reel_decaissable)}</td>
                        <td className="px-4 py-2.5">{formatFCFA(c.cumul_depenses)}</td>
                        <td className={`px-4 py-2.5 font-semibold ${c.solde_restant < 0 ? 'text-[#B3492F]' : ''}`}>{formatFCFA(c.solde_restant)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <BoutonModifier onClick={() => setModaleCommission(c)} />
                            <BoutonSupprimer id={c.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('commissions', c.id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageCommissions} totalPages={Math.max(1, Math.ceil(commissions.length / PAR_PAGE))} onChange={setPageCommissions} />
            </section>

            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
                <p className="text-sm font-bold text-[#1B3B1A]">Dépenses par commission</p>
                <button type="button" onClick={() => setModaleDepense('nouveau')} className="text-xs font-semibold text-white bg-[#B3492F] hover:bg-[#8a3722] px-3 py-1.5 rounded-lg">
                  + Ajouter
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Commission</th>
                      <th className="px-4 py-2.5 font-medium">Libellé</th>
                      <th className="px-4 py-2.5 font-medium">Montant</th>
                      <th className="px-4 py-2.5 font-medium">Justificatif</th>
                      <th className="px-4 py-2.5 font-medium">Date</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7F2DE]">
                    {depensesLignes.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-5 text-center text-gray-400">Aucune dépense enregistrée.</td></tr>
                    ) : paginer(depensesLignes, pageDepenses, PAR_PAGE).map(l => (
                      <tr key={l.id} className="text-[#1B3B1A]">
                        <td className="px-4 py-2.5 text-gray-500">{nomCommission(l.commission_id)}</td>
                        <td className="px-4 py-2.5">{l.detail}</td>
                        <td className="px-4 py-2.5 font-medium text-[#B3492F]">{formatFCFA(l.montant)}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{l.justificatif_numero ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(l.date_mouvement)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <BoutonModifier onClick={() => setModaleDepense(l)} />
                            <BoutonSupprimer id={l.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('tresorerie', l.id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageDepenses} totalPages={Math.max(1, Math.ceil(depensesLignes.length / PAR_PAGE))} onChange={setPageDepenses} />
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/* Onglet 3 — Mobilisation des fonds (Donateurs, Boutique, Autres revenus) */}
        {/* ============================================================ */}
        {onglet === 'mobilisation' && (
          <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#E7F2DE]">
              <p className="text-sm font-bold text-[#1B3B1A]">Mobilisation des fonds</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setModaleDonateur('nouveau')} className="text-xs font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE] px-3 py-1.5 rounded-lg">
                  + Donateur
                </button>
                <button type="button" onClick={() => setModaleBoutique('nouveau')} className="text-xs font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE] px-3 py-1.5 rounded-lg">
                  + Boutique
                </button>
                <button type="button" onClick={() => setModaleAutreRevenu('nouveau')} className="text-xs font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE] px-3 py-1.5 rounded-lg">
                  + Autre revenu
                </button>
                <button type="button" onClick={() => setModaleSubvention('nouveau')} className="text-xs font-semibold text-white bg-[#D9A441] hover:bg-[#C4933A] px-3 py-1.5 rounded-lg">
                  + Subvention reçue
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Type</th>
                    <th className="px-4 py-2.5 font-medium">Nom</th>
                    <th className="px-4 py-2.5 font-medium">Détail</th>
                    <th className="px-4 py-2.5 font-medium">Montant</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7F2DE]">
                  {mobilisationLignes.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-5 text-center text-gray-400">Aucun mouvement enregistré.</td></tr>
                  ) : paginer(mobilisationLignes, pageMobilisation, PAR_PAGE).map(l => (
                    <tr key={l.id} className="text-[#1B3B1A]">
                      <td className="px-4 py-2.5 text-gray-500">{libelleCategorieMobilisation(l.categorie)}</td>
                      <td className="px-4 py-2.5 font-medium">{l.nom_partie ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{l.detail || '—'}</td>
                      <td className="px-4 py-2.5 font-medium text-[#4F8A3D]">{formatFCFA(l.montant)}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(l.date_mouvement)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <BoutonModifier onClick={() => {
                            if (l.categorie === 'vente_gadgets') setModaleBoutique(l)
                            else if (l.categorie === 'don_interne' || l.categorie === 'don_externe') setModaleDonateur(l)
                            else if (l.categorie === 'subvention') setModaleSubvention(l)
                            else setModaleAutreRevenu(l)
                          }} />
                          <BoutonSupprimer id={l.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('tresorerie', l.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pageMobilisation} totalPages={Math.max(1, Math.ceil(mobilisationLignes.length / PAR_PAGE))} onChange={setPageMobilisation} />
          </section>
        )}

        {/* ============================================================ */}
        {/* Onglet 4 — Registre des Dons en Nature */}
        {/* ============================================================ */}
        {onglet === 'dons' && (
          <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
              <p className="text-sm font-bold text-[#1B3B1A]">Dons en nature</p>
              <button type="button" onClick={() => setModaleDonNature('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                + Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Désignation</th>
                    <th className="px-4 py-2.5 font-medium">Qté / Unité</th>
                    <th className="px-4 py-2.5 font-medium">Donateur</th>
                    <th className="px-4 py-2.5 font-medium">Commission</th>
                    <th className="px-4 py-2.5 font-medium">Valeur estimée</th>
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7F2DE]">
                  {donsNature.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-5 text-center text-gray-400">Aucun don en nature enregistré.</td></tr>
                  ) : paginer(donsNature, pageDons, PAR_PAGE).map(d => (
                    <tr key={d.id} className="text-[#1B3B1A]">
                      <td className="px-4 py-2.5 font-medium">{d.designation ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{d.quantite ?? '—'} {d.unite ?? ''}</td>
                      <td className="px-4 py-2.5 text-gray-500">{d.nom_donateur ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{nomCommission(d.commission_id)}</td>
                      <td className="px-4 py-2.5">{formatFCFA(d.valeur_estimee)}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(d.date_reception)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <BoutonModifier onClick={() => setModaleDonNature(d)} />
                          <BoutonSupprimer id={d.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('dons_nature', d.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pageDons} totalPages={Math.max(1, Math.ceil(donsNature.length / PAR_PAGE))} onChange={setPageDons} />
          </section>
        )}
      </div>

      {/* Modales */}
      {modaleCommission && (
        <ModaleCommission
          donnee={modaleCommission === 'nouveau' ? null : modaleCommission}
          onFermer={() => setModaleCommission(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleDonNature && (
        <ModaleDonNature
          donnee={modaleDonNature === 'nouveau' ? null : modaleDonNature}
          commissions={commissions}
          onFermer={() => setModaleDonNature(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleDonateur && (
        <ModaleDonateur
          donnee={modaleDonateur === 'nouveau' ? null : modaleDonateur}
          onFermer={() => setModaleDonateur(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleBoutique && (
        <ModaleBoutique
          donnee={modaleBoutique === 'nouveau' ? null : modaleBoutique}
          onFermer={() => setModaleBoutique(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleAutreRevenu && (
        <ModaleAutreRevenu
          donnee={modaleAutreRevenu === 'nouveau' ? null : modaleAutreRevenu}
          onFermer={() => setModaleAutreRevenu(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleSubvention && (
        <ModaleSubvention
          donnee={modaleSubvention === 'nouveau' ? null : modaleSubvention}
          onFermer={() => setModaleSubvention(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleDepense && (
        <ModaleDepense
          donnee={modaleDepense === 'nouveau' ? null : modaleDepense}
          commissions={commissions}
          onFermer={() => setModaleDepense(null)}
          onSauvegarde={charger}
        />
      )}
    </div>
  )
}

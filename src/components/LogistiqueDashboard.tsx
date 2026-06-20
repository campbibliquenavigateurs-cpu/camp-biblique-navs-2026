import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatFCFA } from '../utils/format'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, CarteKPI, paginer } from './ComposantsTableau'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Logistique complète (Phase 11)
// Onglets : Inventaire Matériel, Transport & Flotte, Rapports,
// Configuration (catégories dynamiques).
// ============================================================

const ROLES_LOGISTIQUE = ['admin', 'comite_logistique'] as const
const PAR_PAGE = 10

const champBase = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent'
const labelBase = 'block text-sm font-medium text-[#1B3B1A] mb-1'

const MODES_ACQUISITION = [
  { v: 'propriete_mission', l: 'Propriété de la Mission' },
  { v: 'location', l: 'Location' },
  { v: 'emprunt', l: 'Emprunt' },
  { v: 'achat', l: 'Nouvel achat' },
]
const STATUTS_ACQUISITION = [
  { v: 'en_attente', l: 'En attente' },
  { v: 'securise', l: 'Sécurisé' },
]
const STATUTS_RESTITUTION = [
  { v: 'rendu', l: 'Rendu' },
  { v: 'stocke_mission', l: 'Stocké à la Mission' },
  { v: 'en_attente_reparation', l: 'En attente de réparation' },
]
const TYPES_VEHICULE = [
  { v: 'car_transport', l: 'Car de transport' },
  { v: 'camion_materiel', l: 'Camion matériel' },
  { v: 'vehicule_urgence', l: "Véhicule d'urgence" },
]
const TYPES_CONVOI = [
  { v: 'aller', l: 'Aller (Abidjan → Bingerville)' },
  { v: 'retour', l: 'Retour (Bingerville → Abidjan)' },
]
const STATUTS_CONVOI = [
  { v: 'en_attente', l: 'En attente' },
  { v: 'en_route', l: 'En route' },
  { v: 'arrive', l: 'Arrivé' },
]

// ---- Types ----
interface Categorie { id: string; nom: string }
interface Commission { id: string; nom: string }

interface Materiel {
  id: string
  designation: string
  categorie_id: string | null
  quantite_depart: number | null
  mode_acquisition: string | null
  nom_fournisseur: string | null
  telephone_fournisseur: string | null
  montant_acquisition: number | null
  statut_acquisition: string | null
  commission_id: string | null
  lieu_stockage: string | null
  quantite_retournee_bon_etat: number | null
  quantite_manquante: number | null
  quantite_cassee: number | null
  statut_restitution: string | null
}

interface Vehicule {
  id: string
  type: string
  immatriculation: string | null
  nom_chauffeur: string | null
  telephone_chauffeur: string | null
  capacite_max: number | null
}

interface Convoi {
  id: string
  vehicule_id: string | null
  type_convoi: string
  contenu: string | null
  heure_depart: string | null
  statut: string
}

function libelle(liste: { v: string; l: string }[], valeur: string | null): string {
  return liste.find(o => o.v === valeur)?.l ?? '—'
}

function badgeStatutAcquisition(s: string | null) {
  if (s === 'securise') return { label: 'Sécurisé', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
  return { label: 'En attente', bg: 'bg-gray-100', text: 'text-gray-500' }
}
function badgeStatutRestitution(s: string | null) {
  if (s === 'rendu') return { label: 'Rendu', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
  if (s === 'en_attente_reparation') return { label: 'En attente réparation', bg: 'bg-[#B3492F]/10', text: 'text-[#B3492F]' }
  if (s === 'stocke_mission') return { label: 'Stocké à la Mission', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: '—', bg: 'bg-gray-50', text: 'text-gray-400' }
}
function badgeStatutConvoi(s: string) {
  if (s === 'arrive') return { label: 'Arrivé', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
  if (s === 'en_route') return { label: 'En route', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'En attente', bg: 'bg-gray-100', text: 'text-gray-500' }
}

// ============================================================
// Modale : Catégorie de matériel (ajout / édition)
// ============================================================
function ModaleCategorie({ donnee, onFermer, onSauvegarde }: {
  donnee: Categorie | null
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
      ? await supabase.from('categories_materiel').update({ nom: nom.trim() }).eq('id', donnee.id)
      : await supabase.from('categories_materiel').insert({ nom: nom.trim() })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement. Ce nom existe peut-être déjà."); return }
    toast.succes(donnee ? 'Catégorie mise à jour !' : 'Catégorie ajoutée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la catégorie' : 'Ajouter une catégorie'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Nom de la catégorie</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)} className={champBase} placeholder="Ex : Cuisine" />
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
// Modale : Matériel (ajout / édition) — couvre les 3 phases
// (Avant / Pendant / Après) dans un seul formulaire.
// ============================================================
function ModaleMateriel({ donnee, categories, commissions, onFermer, onSauvegarde }: {
  donnee: Materiel | null
  categories: Categorie[]
  commissions: Commission[]
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [designation, setDesignation] = useState(donnee?.designation ?? '')
  const [categorieId, setCategorieId] = useState(donnee?.categorie_id ?? '')
  const [quantite, setQuantite] = useState(donnee ? String(donnee.quantite_depart ?? '') : '')

  const [modeAcquisition, setModeAcquisition] = useState(donnee?.mode_acquisition ?? '')
  const [nomFournisseur, setNomFournisseur] = useState(donnee?.nom_fournisseur ?? '')
  const [telFournisseur, setTelFournisseur] = useState(donnee?.telephone_fournisseur ?? '')
  const [montant, setMontant] = useState(donnee ? String(donnee.montant_acquisition ?? 0) : '0')
  const [statutAcquisition, setStatutAcquisition] = useState(donnee?.statut_acquisition ?? 'en_attente')

  const [commissionId, setCommissionId] = useState(donnee?.commission_id ?? '')
  const [lieuStockage, setLieuStockage] = useState(donnee?.lieu_stockage ?? '')

  const [qteRetour, setQteRetour] = useState(donnee ? String(donnee.quantite_retournee_bon_etat ?? '') : '')
  const [qteManquante, setQteManquante] = useState(donnee ? String(donnee.quantite_manquante ?? '') : '')
  const [qteCassee, setQteCassee] = useState(donnee ? String(donnee.quantite_cassee ?? '') : '')
  const [statutRestitution, setStatutRestitution] = useState(donnee?.statut_restitution ?? '')

  const [envoi, setEnvoi] = useState(false)

  const valide = designation.trim() !== '' && quantite !== '' && Number(quantite) > 0

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      designation: designation.trim(),
      categorie_id: categorieId || null,
      quantite_depart: Number(quantite),
      mode_acquisition: modeAcquisition || null,
      nom_fournisseur: nomFournisseur.trim() || null,
      telephone_fournisseur: telFournisseur.trim() || null,
      montant_acquisition: Number(montant) || 0,
      statut_acquisition: statutAcquisition,
      commission_id: commissionId || null,
      lieu_stockage: lieuStockage.trim() || null,
      quantite_retournee_bon_etat: qteRetour === '' ? null : Number(qteRetour),
      quantite_manquante: qteManquante === '' ? null : Number(qteManquante),
      quantite_cassee: qteCassee === '' ? null : Number(qteCassee),
      statut_restitution: statutRestitution || null,
    }
    const { error } = donnee
      ? await supabase.from('logistique').update(payload).eq('id', donnee.id)
      : await supabase.from('logistique').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); console.error(error); return }
    toast.succes(donnee ? 'Matériel mis à jour !' : 'Matériel ajouté !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le matériel' : 'Ajouter un matériel'} onFermer={onFermer}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">

        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#5B7A56] mb-2">Informations générales</p>
          <div className="space-y-3">
            <div>
              <label className={labelBase}>Désignation</label>
              <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className={champBase} placeholder="Ex : Tente 4 places" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Catégorie</label>
                <select value={categorieId} onChange={e => setCategorieId(e.target.value)} className={`${champBase} bg-white`}>
                  <option value="">Aucune</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label className={labelBase}>Quantité initiale</label>
                <input type="number" min={1} value={quantite} onChange={e => setQuantite(e.target.value)} className={champBase} placeholder="Ex : 10" />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#5B7A56] mb-2">Phase AVANT — Mobilisation</p>
          <div className="space-y-3">
            <div>
              <label className={labelBase}>Mode d'acquisition</label>
              <select value={modeAcquisition} onChange={e => setModeAcquisition(e.target.value)} className={`${champBase} bg-white`}>
                <option value="">Sélectionner...</option>
                {MODES_ACQUISITION.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Fournisseur / Propriétaire</label>
                <input type="text" value={nomFournisseur} onChange={e => setNomFournisseur(e.target.value)} className={champBase} placeholder="Ex : Ets Koffi" />
              </div>
              <div>
                <label className={labelBase}>Téléphone fournisseur</label>
                <input type="tel" value={telFournisseur} onChange={e => setTelFournisseur(e.target.value)} className={champBase} placeholder="Ex : 07 00 00 00 00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelBase}>Montant (F CFA)</label>
                <input type="number" min={0} value={montant} onChange={e => setMontant(e.target.value)} className={champBase} placeholder="Ex : 50000" />
              </div>
              <div>
                <label className={labelBase}>Statut d'acquisition</label>
                <select value={statutAcquisition} onChange={e => setStatutAcquisition(e.target.value)} className={`${champBase} bg-white`}>
                  {STATUTS_ACQUISITION.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#5B7A56] mb-2">Phase PENDANT — Terrain</p>
          <div className="space-y-3">
            <div>
              <label className={labelBase}>Commission bénéficiaire</label>
              <select value={commissionId} onChange={e => setCommissionId(e.target.value)} className={`${champBase} bg-white`}>
                <option value="">Aucune</option>
                {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className={labelBase}>Lieu de stockage sur le camp</label>
              <input type="text" value={lieuStockage} onChange={e => setLieuStockage(e.target.value)} className={champBase} placeholder="Ex : Cuisine principale" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <p className="text-xs font-bold uppercase tracking-wide text-[#5B7A56] mb-2">Phase APRÈS — Bilan (à remplir en fin de camp)</p>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelBase}>Bon état</label>
                <input type="number" min={0} value={qteRetour} onChange={e => setQteRetour(e.target.value)} className={champBase} placeholder="0" />
              </div>
              <div>
                <label className={labelBase}>Manquant</label>
                <input type="number" min={0} value={qteManquante} onChange={e => setQteManquante(e.target.value)} className={champBase} placeholder="0" />
              </div>
              <div>
                <label className={labelBase}>Cassé</label>
                <input type="number" min={0} value={qteCassee} onChange={e => setQteCassee(e.target.value)} className={champBase} placeholder="0" />
              </div>
            </div>
            <div>
              <label className={labelBase}>Statut de restitution</label>
              <select value={statutRestitution} onChange={e => setStatutRestitution(e.target.value)} className={`${champBase} bg-white`}>
                <option value="">Non renseigné</option>
                {STATUTS_RESTITUTION.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          </div>
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
// Modale : Véhicule (ajout / édition)
// ============================================================
function ModaleVehicule({ donnee, onFermer, onSauvegarde }: {
  donnee: Vehicule | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [type, setType] = useState(donnee?.type ?? '')
  const [immatriculation, setImmatriculation] = useState(donnee?.immatriculation ?? '')
  const [nomChauffeur, setNomChauffeur] = useState(donnee?.nom_chauffeur ?? '')
  const [telChauffeur, setTelChauffeur] = useState(donnee?.telephone_chauffeur ?? '')
  const [capacite, setCapacite] = useState(donnee ? String(donnee.capacite_max ?? '') : '')
  const [envoi, setEnvoi] = useState(false)

  const valide = type !== '' && nomChauffeur.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      type,
      immatriculation: immatriculation.trim() || null,
      nom_chauffeur: nomChauffeur.trim(),
      telephone_chauffeur: telChauffeur.trim() || null,
      capacite_max: capacite === '' ? null : Number(capacite),
    }
    const { error } = donnee
      ? await supabase.from('vehicules').update(payload).eq('id', donnee.id)
      : await supabase.from('vehicules').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Véhicule mis à jour !' : 'Véhicule ajouté !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le véhicule' : 'Ajouter un véhicule'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className={`${champBase} bg-white`}>
            <option value="">Sélectionner...</option>
            {TYPES_VEHICULE.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelBase}>Immatriculation</label>
          <input type="text" value={immatriculation} onChange={e => setImmatriculation(e.target.value)} className={champBase} placeholder="Ex : CI 1234 AB" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelBase}>Nom du chauffeur</label>
            <input type="text" value={nomChauffeur} onChange={e => setNomChauffeur(e.target.value)} className={champBase} placeholder="Ex : Yao Martin" />
          </div>
          <div>
            <label className={labelBase}>Téléphone chauffeur</label>
            <input type="tel" value={telChauffeur} onChange={e => setTelChauffeur(e.target.value)} className={champBase} placeholder="Ex : 07 00 00 00 00" />
          </div>
        </div>
        <div>
          <label className={labelBase}>Capacité maximale (personnes)</label>
          <input type="number" min={0} value={capacite} onChange={e => setCapacite(e.target.value)} className={champBase} placeholder="Ex : 45" />
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
// Modale : Convoi / Rotation (ajout / édition)
// ============================================================
function ModaleConvoi({ donnee, vehicules, onFermer, onSauvegarde }: {
  donnee: Convoi | null
  vehicules: Vehicule[]
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [vehiculeId, setVehiculeId] = useState(donnee?.vehicule_id ?? '')
  const [typeConvoi, setTypeConvoi] = useState(donnee?.type_convoi ?? '')
  const [contenu, setContenu] = useState(donnee?.contenu ?? '')
  const [heureDepart, setHeureDepart] = useState(donnee?.heure_depart ? donnee.heure_depart.slice(0, 16) : '')
  const [statut, setStatut] = useState(donnee?.statut ?? 'en_attente')
  const [envoi, setEnvoi] = useState(false)

  const valide = vehiculeId !== '' && typeConvoi !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const payload = {
      vehicule_id: vehiculeId,
      type_convoi: typeConvoi,
      contenu: contenu.trim() || null,
      heure_depart: heureDepart ? new Date(heureDepart).toISOString() : null,
      statut,
    }
    const { error } = donnee
      ? await supabase.from('convois').update(payload).eq('id', donnee.id)
      : await supabase.from('convois').insert(payload)
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Rotation mise à jour !' : 'Rotation ajoutée !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier la rotation' : 'Ajouter une rotation'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className={labelBase}>Véhicule</label>
          <select value={vehiculeId} onChange={e => setVehiculeId(e.target.value)} className={`${champBase} bg-white`}>
            <option value="">Sélectionner...</option>
            {vehicules.map(v => <option key={v.id} value={v.id}>{v.nom_chauffeur} ({libelle(TYPES_VEHICULE, v.type)})</option>)}
          </select>
        </div>
        <div>
          <label className={labelBase}>Type de convoi</label>
          <select value={typeConvoi} onChange={e => setTypeConvoi(e.target.value)} className={`${champBase} bg-white`}>
            <option value="">Sélectionner...</option>
            {TYPES_CONVOI.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        </div>
        <div>
          <label className={labelBase}>Contenu (passagers ou matériel chargé)</label>
          <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={3} className={champBase} placeholder="Ex : 32 campeurs groupe A, ou Tentes + matelas cuisine" />
        </div>
        <div>
          <label className={labelBase}>Heure de départ programmée</label>
          <input type="datetime-local" value={heureDepart} onChange={e => setHeureDepart(e.target.value)} className={champBase} />
        </div>
        <div>
          <label className={labelBase}>Statut</label>
          <select value={statut} onChange={e => setStatut(e.target.value)} className={`${champBase} bg-white`}>
            {STATUTS_CONVOI.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
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
export default function LogistiqueDashboard() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_LOGISTIQUE)
  const toast = useToast()

  const [onglet, setOnglet] = useState<'inventaire' | 'transport' | 'rapports' | 'configuration'>('inventaire')

  const [categories, setCategories] = useState<Categorie[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [materiels, setMateriels] = useState<Materiel[]>([])
  const [vehicules, setVehicules] = useState<Vehicule[]>([])
  const [convois, setConvois] = useState<Convoi[]>([])
  const [chargement, setChargement] = useState(true)

  const [rechercheMateriel, setRechercheMateriel] = useState('')
  const [pageMateriel, setPageMateriel] = useState(1)
  const [pageVehicules, setPageVehicules] = useState(1)
  const [pageConvois, setPageConvois] = useState(1)
  const [pageCategories, setPageCategories] = useState(1)

  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  const [modaleCategorie, setModaleCategorie] = useState<Categorie | 'nouveau' | null>(null)
  const [modaleMateriel, setModaleMateriel] = useState<Materiel | 'nouveau' | null>(null)
  const [modaleVehicule, setModaleVehicule] = useState<Vehicule | 'nouveau' | null>(null)
  const [modaleConvoi, setModaleConvoi] = useState<Convoi | 'nouveau' | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resCat, resCom, resMat, resVeh, resConv] = await Promise.all([
      supabase.from('categories_materiel').select('*').order('nom'),
      supabase.from('commissions').select('id,nom').order('nom'),
      supabase.from('logistique').select('*').order('designation'),
      supabase.from('vehicules').select('*').order('created_at', { ascending: false }),
      supabase.from('convois').select('*').order('heure_depart', { ascending: true }),
    ])
    if (resCat.data) setCategories(resCat.data as Categorie[])
    if (resCom.data) setCommissions(resCom.data as Commission[])
    if (resMat.data) setMateriels(resMat.data as Materiel[])
    if (resVeh.data) setVehicules(resVeh.data as Vehicule[])
    if (resConv.data) setConvois(resConv.data as Convoi[])
    setChargement(false)
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const materielsFiltres = useMemo(() => {
    const q = rechercheMateriel.trim().toLowerCase()
    if (!q) return materiels
    return materiels.filter(m => m.designation.toLowerCase().includes(q))
  }, [materiels, rechercheMateriel])

  function nomCategorie(id: string | null): string {
    return categories.find(c => c.id === id)?.nom ?? '—'
  }
  function nomCommission(id: string | null): string {
    return commissions.find(c => c.id === id)?.nom ?? '—'
  }
  function vehiculeDe(convoi: Convoi): Vehicule | undefined {
    return vehicules.find(v => v.id === convoi.vehicule_id)
  }

  async function supprimer(table: 'categories_materiel' | 'logistique' | 'vehicules' | 'convois', id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Supprimé avec succès.')
    charger()
  }

  async function changerStatutConvoi(id: string, statut: string) {
    const { error } = await supabase.from('convois').update({ statut }).eq('id', id)
    if (error) { toast.erreur('Erreur lors de la mise à jour.'); return }
    charger()
  }

  // ---- KPI (onglet Rapports) ----
  const totalArticles = materiels.reduce((s, m) => s + (m.quantite_depart ?? 0), 0)
  const totalRetourBonEtat = materiels.reduce((s, m) => s + (m.quantite_retournee_bon_etat ?? 0), 0)
  const tauxRestitution = totalArticles > 0 ? (totalRetourBonEtat / totalArticles) * 100 : 0
  const nombreVehicules = vehicules.length

  // ---- Export Excel consolidé (3 feuilles) ----
  async function exporterExcel() {
    const { utils, writeFileXLSX } = await import('xlsx')

    const feuilleInventaire = utils.json_to_sheet(materiels.map(m => ({
      Désignation: m.designation, Catégorie: nomCategorie(m.categorie_id),
      'Quantité initiale': m.quantite_depart ?? 0,
      "Mode d'acquisition": libelle(MODES_ACQUISITION, m.mode_acquisition),
      'Statut acquisition': libelle(STATUTS_ACQUISITION, m.statut_acquisition),
      Commission: nomCommission(m.commission_id), 'Lieu de stockage': m.lieu_stockage ?? '',
      'Retour bon état': m.quantite_retournee_bon_etat ?? '', Manquant: m.quantite_manquante ?? '', Cassé: m.quantite_cassee ?? '',
      'Statut restitution': libelle(STATUTS_RESTITUTION, m.statut_restitution),
    })))

    const feuilleTransport = utils.json_to_sheet(convois.map(c => {
      const v = vehiculeDe(c)
      return {
        Véhicule: v ? `${libelle(TYPES_VEHICULE, v.type)} (${v.immatriculation ?? '—'})` : '—',
        Chauffeur: v?.nom_chauffeur ?? '—', 'Téléphone chauffeur': v?.telephone_chauffeur ?? '—',
        'Type convoi': libelle(TYPES_CONVOI, c.type_convoi), Contenu: c.contenu ?? '',
        'Heure départ': c.heure_depart ? new Date(c.heure_depart).toLocaleString('fr-FR') : '—',
        Statut: libelle(STATUTS_CONVOI, c.statut),
      }
    }))

    const feuilleFournisseurs = utils.json_to_sheet(
      materiels.filter(m => m.nom_fournisseur).map(m => ({
        Désignation: m.designation, Fournisseur: m.nom_fournisseur ?? '', Téléphone: m.telephone_fournisseur ?? '',
        "Mode d'acquisition": libelle(MODES_ACQUISITION, m.mode_acquisition),
        'Montant (F CFA)': m.montant_acquisition ?? 0, Statut: libelle(STATUTS_ACQUISITION, m.statut_acquisition),
      }))
    )

    const classeur = utils.book_new()
    utils.book_append_sheet(classeur, feuilleInventaire, 'Bilan Inventaire Matériel')
    utils.book_append_sheet(classeur, feuilleTransport, 'Plan de Transport & Passagers')
    utils.book_append_sheet(classeur, feuilleFournisseurs, 'Suivi Fournisseurs & Cautions')
    writeFileXLSX(classeur, `logistique_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ---- Export PDF (rapport + fiches de chargement par convoi) ----
  async function exporterPDF() {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF()

    doc.setFontSize(13)
    doc.text('Mission Évangélique des Navigateurs CI', 14, 15)
    doc.setFontSize(11)
    doc.text('Rapport logistique — Camp Biblique-Navs 2026', 14, 22)
    doc.setFontSize(9)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 28)

    autoTable(doc, {
      startY: 35,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Total articles mobilisés', String(totalArticles)],
        ['Taux de restitution', `${Math.round(tauxRestitution * 10) / 10}%`],
        ['Véhicules enregistrés', String(nombreVehicules)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 59, 26] },
    })

    autoTable(doc, {
      head: [['Désignation', 'Catégorie', 'Qté', 'Commission', 'Lieu', 'Statut retour']],
      body: materiels.map(m => [
        m.designation, nomCategorie(m.categorie_id), String(m.quantite_depart ?? ''),
        nomCommission(m.commission_id), m.lieu_stockage ?? '', libelle(STATUTS_RESTITUTION, m.statut_restitution),
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [27, 59, 26] },
    })

    // Une fiche de chargement / émargement par convoi, sur une nouvelle page.
    convois.forEach(c => {
      const v = vehiculeDe(c)
      doc.addPage()
      doc.setFontSize(12)
      doc.text('Fiche de chargement — Camp Biblique-Navs 2026', 14, 15)
      doc.setFontSize(9)
      doc.text(`Type : ${libelle(TYPES_CONVOI, c.type_convoi)}`, 14, 23)
      doc.text(`Véhicule : ${v ? `${libelle(TYPES_VEHICULE, v.type)} — ${v.immatriculation ?? '—'}` : '—'}`, 14, 29)
      doc.text(`Chauffeur : ${v?.nom_chauffeur ?? '—'} (${v?.telephone_chauffeur ?? '—'})`, 14, 35)
      doc.text(`Heure de départ : ${c.heure_depart ? new Date(c.heure_depart).toLocaleString('fr-FR') : 'Non programmée'}`, 14, 41)
      doc.text('Contenu / Manifeste :', 14, 49)
      doc.setFontSize(8)
      const lignesContenu = doc.splitTextToSize(c.contenu || 'Non renseigné', 180)
      doc.text(lignesContenu, 14, 55)
      doc.setFontSize(9)
      doc.text('Signature chef de convoi : _______________________', 14, 270)
    })

    doc.save(`rapport_logistique_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }
  if (statutAcces === 'non_connecte') return <Login onConnecte={verifierAcces} />
  if (statutAcces === 'refuse') return <AccesRestreint message="Ce module est réservé à l'équipe logistique." />

  const ONGLETS: { cle: typeof onglet; label: string }[] = [
    { cle: 'inventaire', label: 'Inventaire Matériel' },
    { cle: 'transport', label: 'Transport & Flotte' },
    { cle: 'rapports', label: 'Rapports' },
    { cle: 'configuration', label: 'Configuration' },
  ]

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-6xl mx-auto space-y-5">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Logistique</h1>
          {onglet === 'rapports' && (
            <div className="flex gap-2">
              <button type="button" onClick={exporterExcel} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
                Export Excel Logistique
              </button>
              <button type="button" onClick={exporterPDF} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE]">
                Export PDF Logistique
              </button>
            </div>
          )}
        </div>

        {/* Onglets */}
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
        {/* Onglet : Inventaire Matériel */}
        {/* ============================================================ */}
        {onglet === 'inventaire' && (
          <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#E7F2DE]">
              <input
                type="text"
                value={rechercheMateriel}
                onChange={e => { setRechercheMateriel(e.target.value); setPageMateriel(1) }}
                placeholder="Rechercher un article..."
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
              />
              <button type="button" onClick={() => setModaleMateriel('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                + Ajouter un matériel
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Désignation</th>
                    <th className="px-4 py-2.5 font-medium">Catégorie</th>
                    <th className="px-4 py-2.5 font-medium">Qté init.</th>
                    <th className="px-4 py-2.5 font-medium">Fournisseur</th>
                    <th className="px-4 py-2.5 font-medium">Montant</th>
                    <th className="px-4 py-2.5 font-medium">Acquisition</th>
                    <th className="px-4 py-2.5 font-medium">Commission</th>
                    <th className="px-4 py-2.5 font-medium">Lieu</th>
                    <th className="px-4 py-2.5 font-medium">Retour (bon/manq./cassé)</th>
                    <th className="px-4 py-2.5 font-medium">Restitution</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7F2DE]">
                  {chargement ? (
                    <tr><td colSpan={11} className="px-4 py-5 text-center text-gray-400">Chargement...</td></tr>
                  ) : materielsFiltres.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-5 text-center text-gray-400">Aucun matériel enregistré.</td></tr>
                  ) : paginer(materielsFiltres, pageMateriel, PAR_PAGE).map(m => {
                    const badgeAcq = badgeStatutAcquisition(m.statut_acquisition)
                    const badgeRest = badgeStatutRestitution(m.statut_restitution)
                    return (
                      <tr key={m.id} className="text-[#1B3B1A]">
                        <td className="px-4 py-2.5 font-medium">{m.designation}</td>
                        <td className="px-4 py-2.5 text-gray-500">{nomCategorie(m.categorie_id)}</td>
                        <td className="px-4 py-2.5">{m.quantite_depart ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {m.telephone_fournisseur ? (
                            <a href={`tel:+225${m.telephone_fournisseur}`} className="text-[#4F8A3D] hover:underline">{m.nom_fournisseur ?? m.telephone_fournisseur}</a>
                          ) : (m.nom_fournisseur ?? '—')}
                        </td>
                        <td className="px-4 py-2.5">{formatFCFA(m.montant_acquisition ?? 0)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeAcq.bg} ${badgeAcq.text}`}>{badgeAcq.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{nomCommission(m.commission_id)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{m.lieu_stockage ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {m.quantite_retournee_bon_etat ?? 0} / {m.quantite_manquante ?? 0} / {m.quantite_cassee ?? 0}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeRest.bg} ${badgeRest.text}`}>{badgeRest.label}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <BoutonModifier onClick={() => setModaleMateriel(m)} />
                            <BoutonSupprimer id={m.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('logistique', m.id)} />
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={pageMateriel} totalPages={Math.max(1, Math.ceil(materielsFiltres.length / PAR_PAGE))} onChange={setPageMateriel} />
          </section>
        )}

        {/* ============================================================ */}
        {/* Onglet : Transport & Flotte */}
        {/* ============================================================ */}
        {onglet === 'transport' && (
          <>
            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
                <p className="text-sm font-bold text-[#1B3B1A]">Registre des véhicules</p>
                <button type="button" onClick={() => setModaleVehicule('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                  + Ajouter un véhicule
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Immatriculation</th>
                      <th className="px-4 py-2.5 font-medium">Chauffeur</th>
                      <th className="px-4 py-2.5 font-medium">Capacité</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7F2DE]">
                    {vehicules.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-5 text-center text-gray-400">Aucun véhicule enregistré.</td></tr>
                    ) : paginer(vehicules, pageVehicules, PAR_PAGE).map(v => (
                      <tr key={v.id} className="text-[#1B3B1A]">
                        <td className="px-4 py-2.5 font-medium">{libelle(TYPES_VEHICULE, v.type)}</td>
                        <td className="px-4 py-2.5 text-gray-500">{v.immatriculation ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {v.telephone_chauffeur ? (
                            <a href={`tel:+225${v.telephone_chauffeur}`} className="text-[#4F8A3D] hover:underline">{v.nom_chauffeur}</a>
                          ) : (v.nom_chauffeur ?? '—')}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{v.capacite_max ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <BoutonModifier onClick={() => setModaleVehicule(v)} />
                            <BoutonSupprimer id={v.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('vehicules', v.id)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageVehicules} totalPages={Math.max(1, Math.ceil(vehicules.length / PAR_PAGE))} onChange={setPageVehicules} />
            </section>

            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
                <p className="text-sm font-bold text-[#1B3B1A]">Rotations &amp; convois</p>
                <button type="button" onClick={() => setModaleConvoi('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                  + Ajouter une rotation
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                      <th className="px-4 py-2.5 font-medium">Véhicule</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Contenu</th>
                      <th className="px-4 py-2.5 font-medium">Départ</th>
                      <th className="px-4 py-2.5 font-medium">Statut</th>
                      <th className="px-4 py-2.5 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7F2DE]">
                    {convois.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-5 text-center text-gray-400">Aucune rotation programmée.</td></tr>
                    ) : paginer(convois, pageConvois, PAR_PAGE).map(c => {
                      const v = vehiculeDe(c)
                      const badge = badgeStatutConvoi(c.statut)
                      return (
                        <tr key={c.id} className="text-[#1B3B1A]">
                          <td className="px-4 py-2.5 font-medium">{v ? `${v.nom_chauffeur} (${v.immatriculation ?? '—'})` : '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500">{libelle(TYPES_CONVOI, c.type_convoi)}</td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate" title={c.contenu ?? ''}>{c.contenu ?? '—'}</td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{c.heure_depart ? new Date(c.heure_depart).toLocaleString('fr-FR') : '—'}</td>
                          <td className="px-4 py-2.5">
                            <select
                              value={c.statut}
                              onChange={e => changerStatutConvoi(c.id, e.target.value)}
                              className={`text-xs font-bold px-2 py-1 rounded-lg border-0 ${badge.bg} ${badge.text}`}
                            >
                              {STATUTS_CONVOI.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2.5">
                              <BoutonModifier onClick={() => setModaleConvoi(c)} />
                              <BoutonSupprimer id={c.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('convois', c.id)} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination page={pageConvois} totalPages={Math.max(1, Math.ceil(convois.length / PAR_PAGE))} onChange={setPageConvois} />
            </section>
          </>
        )}

        {/* ============================================================ */}
        {/* Onglet : Rapports */}
        {/* ============================================================ */}
        {onglet === 'rapports' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <CarteKPI label="Total articles mobilisés" valeur={chargement ? '—' : String(totalArticles)} />
            <CarteKPI label="Taux de restitution" valeur={chargement ? '—' : `${Math.round(tauxRestitution * 10) / 10}%`} accent="text-[#4F8A3D]" />
            <CarteKPI label="Véhicules enregistrés" valeur={chargement ? '—' : String(nombreVehicules)} accent="text-[#D9A441]" />
          </div>
        )}

        {/* ============================================================ */}
        {/* Onglet : Configuration (catégories) */}
        {/* ============================================================ */}
        {onglet === 'configuration' && (
          <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
              <p className="text-sm font-bold text-[#1B3B1A]">Catégories de matériel</p>
              <button type="button" onClick={() => setModaleCategorie('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                + Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                    <th className="px-4 py-2.5 font-medium">Nom</th>
                    <th className="px-4 py-2.5 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7F2DE]">
                  {categories.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-5 text-center text-gray-400">Aucune catégorie enregistrée.</td></tr>
                  ) : paginer(categories, pageCategories, PAR_PAGE).map(c => (
                    <tr key={c.id} className="text-[#1B3B1A]">
                      <td className="px-4 py-2.5 font-medium">{c.nom}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <BoutonModifier onClick={() => setModaleCategorie(c)} />
                          <BoutonSupprimer id={c.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer('categories_materiel', c.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={pageCategories} totalPages={Math.max(1, Math.ceil(categories.length / PAR_PAGE))} onChange={setPageCategories} />
          </section>
        )}
      </div>

      {/* Modales */}
      {modaleCategorie && (
        <ModaleCategorie
          donnee={modaleCategorie === 'nouveau' ? null : modaleCategorie}
          onFermer={() => setModaleCategorie(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleMateriel && (
        <ModaleMateriel
          donnee={modaleMateriel === 'nouveau' ? null : modaleMateriel}
          categories={categories}
          commissions={commissions}
          onFermer={() => setModaleMateriel(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleVehicule && (
        <ModaleVehicule
          donnee={modaleVehicule === 'nouveau' ? null : modaleVehicule}
          onFermer={() => setModaleVehicule(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleConvoi && (
        <ModaleConvoi
          donnee={modaleConvoi === 'nouveau' ? null : modaleConvoi}
          vehicules={vehicules}
          onFermer={() => setModaleConvoi(null)}
          onSauvegarde={charger}
        />
      )}
    </div>
  )
}

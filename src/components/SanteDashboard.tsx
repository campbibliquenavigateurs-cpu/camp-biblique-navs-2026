import { useCallback, useEffect, useMemo, useState } from 'react'
import { Droplet, Phone, PhoneCall, X, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { Modale, Pagination, paginer } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Santé, Onglet 2 (Phase 19)
// Suivi préventif des campeurs + Main courante des consultations,
// avec déstockage automatique de la pharmacie. Écran strictement
// confidentiel (admin / comité santé uniquement).
// ============================================================

const ROLES_SANTE = ['admin', 'comite_sante'] as const
const PAR_PAGE = 10

const JOURS_CAMP = ['2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29']
const MOMENTS: { v: 'matin' | 'midi' | 'soir'; l: string }[] = [
  { v: 'matin', l: 'Matin' }, { v: 'midi', l: 'Midi' }, { v: 'soir', l: 'Soir' },
]

const MOTIFS = ['Fièvre/Palu', 'Céphalées', 'Blessures', 'Digestif', "Crise d'asthme", 'Autre']
const STATUTS_SORTIE = [
  { v: 'retour_activites', l: 'Retour aux activités' },
  { v: 'repos_cabine', l: 'Repos en cabine médicale' },
  { v: 'evacuation', l: 'Évacuation sanitaire extérieure' },
]

function badgeStatutSortie(s: string) {
  if (s === 'evacuation') return { label: 'Évacuation', bg: 'bg-[#B3492F]/10', text: 'text-[#B3492F]' }
  if (s === 'repos_cabine') return { label: 'Repos cabine', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'Retour activités', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
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
interface Medicament { id: string; nom: string; quantite_stock: number; unite: string | null }
interface Consultation {
  id: string
  inscription_id: string
  motif: string
  temperature: number | null
  tension: string | null
  description_soins: string | null
  medicament_id: string | null
  quantite_distribuee: number | null
  statut_sortie: string
  created_at: string
}

function aUneAlerte(antecedents: string | null): boolean {
  if (!antecedents) return false
  const t = antecedents.trim().toLowerCase()
  return t !== '' && t !== 'aucun' && t !== 'aucune'
}

const STYLES = `
  @keyframes glisserDepuisDroite {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }
  .drawer-entree { animation: glisserDepuisDroite 0.25s ease-out; }
`

// ============================================================
// Fiche d'urgence — volet latéral (drawer)
// ============================================================
function FicheUrgence({ campeur, commissions, profil, suivi, onFermer, onMaj }: {
  campeur: Inscription
  commissions: Commission[]
  profil: ProfilMedical | undefined
  suivi: SuiviJour[]
  onFermer: () => void
  onMaj: () => void
}) {
  const toast = useToast()
  const [groupeSanguin, setGroupeSanguin] = useState(profil?.groupe_sanguin ?? '')
  const [traitementChronique, setTraitementChronique] = useState(profil?.traitement_chronique ?? false)
  const [traitementNom, setTraitementNom] = useState(profil?.traitement_nom ?? '')
  const [commissionId, setCommissionId] = useState(campeur.commission_id ?? '')
  const [envoi, setEnvoi] = useState(false)

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

  const nomCommission = commissions.find(c => c.id === commissionId)?.nom

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onFermer}>
      <style>{STYLES}</style>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="drawer-entree relative bg-white w-full max-w-sm h-full overflow-y-auto shadow-2xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg font-bold text-[#1B3B1A]">{campeur.prenoms} {campeur.nom}</p>
          <button type="button" onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {/* Groupe sanguin mis en valeur */}
        <div className="bg-[#B3492F]/5 border border-[#B3492F]/20 rounded-xl p-4 flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#B3492F]/10 flex items-center justify-center shrink-0">
            <Droplet className="w-6 h-6 text-[#B3492F]" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Groupe sanguin</p>
            <input
              type="text"
              value={groupeSanguin}
              onChange={e => setGroupeSanguin(e.target.value)}
              placeholder="Ex : O+"
              className="text-lg font-bold text-[#B3492F] bg-transparent border-0 focus:outline-none w-24"
            />
          </div>
        </div>

        {/* Commission d'affectation */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Commission d'affectation</label>
          <select value={commissionId} onChange={e => setCommissionId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Aucune</option>
            {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          {nomCommission && <p className="text-xs text-gray-400 mt-1">Pour le localiser rapidement sur le camp.</p>}
        </div>

        {/* Antécédents déjà renseignés à l'inscription */}
        <div className="mb-4">
          <p className="text-sm font-medium text-[#1B3B1A] mb-1">Antécédents renseignés à l'inscription</p>
          <p className={`text-sm rounded-lg px-3 py-2 ${aUneAlerte(campeur.antecedents_medicaux) ? 'bg-[#B3492F]/10 text-[#B3492F]' : 'bg-gray-50 text-gray-400'}`}>
            {campeur.antecedents_medicaux || 'Aucun renseigné'}
          </p>
        </div>

        {/* Traitement chronique */}
        <div className="mb-4 border-t border-gray-100 pt-4">
          <label className="flex items-center gap-2 mb-2 cursor-pointer">
            <input type="checkbox" checked={traitementChronique} onChange={e => setTraitementChronique(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#4F8A3D] focus:ring-[#4F8A3D]" />
            <span className="text-sm font-medium text-[#1B3B1A]">Traitement chronique en cours</span>
          </label>
          {traitementChronique && (
            <input type="text" value={traitementNom} onChange={e => setTraitementNom(e.target.value)}
              placeholder="Nom du traitement"
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

        {/* Actions d'urgence */}
        <div className="border-t border-gray-100 pt-4 space-y-2">
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
      </div>
    </div>
  )
}

// ============================================================
// Formulaire de consultation rapide (Main Courante)
// ============================================================
function FormulaireConsultation({ campeur, medicaments, onAnnuler, onEnregistre }: {
  campeur: Inscription
  medicaments: Medicament[]
  onAnnuler: () => void
  onEnregistre: () => void
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
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Motif</label>
        <select value={motif} onChange={e => setMotif(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
          <option value="">Sélectionner...</option>
          {MOTIFS.map(m => <option key={m} value={m}>{m}</option>)}
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
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Statut de sortie</label>
        <select value={statutSortie} onChange={e => setStatutSortie(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
          <option value="">Sélectionner...</option>
          {STATUTS_SORTIE.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
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
// Modale : ajout rapide d'un médicament au stock (nécessaire pour
// que l'interconnexion pharmacie soit utilisable dès maintenant).
// ============================================================
function ModaleMedicament({ onFermer, onSauvegarde }: { onFermer: () => void; onSauvegarde: () => void }) {
  const toast = useToast()
  const [nom, setNom] = useState('')
  const [quantite, setQuantite] = useState('')
  const [unite, setUnite] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const valide = nom.trim() !== '' && quantite !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = await supabase.from('pharmacie_stock').insert({
      nom: nom.trim(), quantite_stock: Number(quantite), unite: unite.trim() || null,
    })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Médicament ajouté au stock !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre="Ajouter un médicament au stock" onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Paracétamol 500mg" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Quantité initiale</label>
            <input type="number" min={0} value={quantite} onChange={e => setQuantite(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : 100" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Unité</label>
            <input type="text" value={unite} onChange={e => setUnite(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : comprimés" />
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
// Composant principal
// ============================================================
export default function SanteDashboard() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_SANTE)

  const [sousEcran, setSousEcran] = useState<'suivi' | 'main_courante'>('suivi')

  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [profils, setProfils] = useState<ProfilMedical[]>([])
  const [suivi, setSuivi] = useState<SuiviJour[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [chargement, setChargement] = useState(true)

  const [filtreSuivi, setFiltreSuivi] = useState<'tous' | 'alertes' | 'chroniques'>('tous')
  const [pageSuivi, setPageSuivi] = useState(1)
  const [pageConsultations, setPageConsultations] = useState(1)

  const [campeurOuvert, setCampeurOuvert] = useState<Inscription | null>(null)
  const [modaleMedicament, setModaleMedicament] = useState(false)

  const [rechercheConsultation, setRechercheConsultation] = useState('')
  const [campeurConsultation, setCampeurConsultation] = useState<Inscription | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resInsc, resCom, resProfils, resSuivi, resMed, resConsult] = await Promise.all([
      supabase.from('inscriptions').select('id,nom,prenoms,telephone,antecedents_medicaux,contact_urgence_nom,contact_urgence_telephone,commission_id').order('nom'),
      supabase.from('commissions').select('id,nom').order('nom'),
      supabase.from('profils_medicaux').select('*'),
      supabase.from('suivi_traitement').select('*'),
      supabase.from('pharmacie_stock').select('*').order('nom'),
      supabase.from('consultations_medicales').select('*').order('created_at', { ascending: false }),
    ])
    if (resInsc.data) setInscriptions(resInsc.data as Inscription[])
    if (resCom.data) setCommissions(resCom.data as Commission[])
    if (resProfils.data) setProfils(resProfils.data as ProfilMedical[])
    if (resSuivi.data) setSuivi(resSuivi.data as SuiviJour[])
    if (resMed.data) setMedicaments(resMed.data as Medicament[])
    if (resConsult.data) setConsultations(resConsult.data as Consultation[])
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

        <h1 className="text-2xl font-bold text-[#1B3B1A]">Santé — Suivi &amp; Consultations</h1>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-x-auto">
          <div className="flex">
            <button type="button" onClick={() => setSousEcran('suivi')}
              className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${sousEcran === 'suivi' ? 'border-[#4F8A3D] text-[#1B3B1A] bg-[#F4F9F0]' : 'border-transparent text-gray-400 hover:text-[#1B3B1A]'}`}>
              Suivi des campeurs
            </button>
            <button type="button" onClick={() => setSousEcran('main_courante')}
              className={`flex-1 whitespace-nowrap px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 ${sousEcran === 'main_courante' ? 'border-[#4F8A3D] text-[#1B3B1A] bg-[#F4F9F0]' : 'border-transparent text-gray-400 hover:text-[#1B3B1A]'}`}>
              Main courante
            </button>
          </div>
        </div>

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
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {profil?.traitement_chronique ? (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#D9A441]/15 text-[#8A6A23]">{profil.traitement_nom || 'Oui'}</span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
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
            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
                <p className="text-sm font-bold text-[#1B3B1A]">Stock pharmacie {medicaments.length > 0 && `(${medicaments.length})`}</p>
                <button type="button" onClick={() => setModaleMedicament(true)} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
                  + Ajouter un médicament
                </button>
              </div>
              <div className="divide-y divide-[#E7F2DE]">
                {medicaments.length === 0 ? (
                  <p className="px-5 py-4 text-sm text-gray-400">Aucun médicament enregistré dans le stock.</p>
                ) : medicaments.map(m => (
                  <div key={m.id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm font-medium text-[#1B3B1A]">{m.nom}</p>
                    <span className={`text-sm font-semibold ${m.quantite_stock <= 0 ? 'text-[#B3492F]' : 'text-[#4F8A3D]'}`}>
                      {m.quantite_stock} {m.unite ?? ''}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#1B3B1A]">Nouvelle consultation</p>
              </div>

              {!campeurConsultation ? (
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.8} />
                    <input
                      type="text"
                      value={rechercheConsultation}
                      onChange={e => setRechercheConsultation(e.target.value)}
                      placeholder="Rechercher un campeur par nom..."
                      className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
                    />
                  </div>
                  {suggestionsRecherche.length > 0 && (
                    <div className="absolute z-10 inset-x-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {suggestionsRecherche.map(i => (
                        <button key={i.id} type="button"
                          onClick={() => { setCampeurConsultation(i); setRechercheConsultation('') }}
                          className="w-full text-left px-3 py-2.5 text-sm text-[#1B3B1A] hover:bg-[#F4F9F0]">
                          {i.prenoms} {i.nom}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <FormulaireConsultation
                  campeur={campeurConsultation}
                  medicaments={medicaments}
                  onAnnuler={() => setCampeurConsultation(null)}
                  onEnregistre={() => { setCampeurConsultation(null); charger() }}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7F2DE]">
                    {chargement ? (
                      <SkeletonTableau lignes={5} colonnes={5} />
                    ) : consultations.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-5 text-center text-gray-400">Aucune consultation enregistrée.</td></tr>
                    ) : paginer(consultations, pageConsultations, PAR_PAGE).map(c => {
                      const badge = badgeStatutSortie(c.statut_sortie)
                      return (
                        <tr key={c.id} className="text-[#1B3B1A]">
                          <td className="px-4 py-2.5 font-medium">{nomCampeur(c.inscription_id)}</td>
                          <td className="px-4 py-2.5 text-gray-500">{c.motif}</td>
                          <td className="px-4 py-2.5 text-gray-500">
                            {c.temperature ? `${c.temperature}°C` : ''}{c.temperature && c.tension ? ' · ' : ''}{c.tension ?? ''}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateFr(c.created_at)}</td>
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
      </div>

      {campeurOuvert && (
        <FicheUrgence
          campeur={campeurOuvert}
          commissions={commissions}
          profil={profilDe(campeurOuvert.id)}
          suivi={suivi.filter(s => s.inscription_id === campeurOuvert.id)}
          onFermer={() => setCampeurOuvert(null)}
          onMaj={charger}
        />
      )}
      {modaleMedicament && (
        <ModaleMedicament onFermer={() => setModaleMedicament(false)} onSauvegarde={charger} />
      )}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import { useToast } from './Toast'
import AccesRestreint from './AccesRestreint'
import Login from './Login'
import { formatFCFA } from '../utils/format'
import { SkeletonTableau } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Gestion des inscriptions (Phase 7)
// Réservé au rôle : admin (plus strict que le RLS de la table,
// qui autorise aussi comite_treso — restriction volontaire ici).
// montant_paye est désormais calculé automatiquement par un
// trigger PostgreSQL à partir de la table "versements" : il n'est
// plus modifiable directement, seul l'ajout d'un versement daté l'est.
// ============================================================

const ROLES_ADMIN = ['admin'] as const
const PAR_PAGE = 20
const COULEURS_FAMILLE = ['#5B8FB9', '#8E7CC3', '#5BAFA0', '#C77DBA', '#A3A86C']

interface Inscription {
  id: string
  nom: string
  prenoms: string
  genre: string | null
  categorie: string | null
  telephone: string
  ville: string | null
  commune_quartier: string | null
  taille_polo: string | null
  contact_urgence_nom: string | null
  contact_urgence_telephone: string | null
  montant_du: number
  montant_paye: number
  reduction_accordee: number
  date_inscription: string
}

interface Versement { id: string; montant: number; date_versement: string }


function solde(ins: Inscription) {
  return Math.max(0, (ins.montant_du ?? 0) - (ins.reduction_accordee ?? 0) - (ins.montant_paye ?? 0))
}

function statutBadge(s: number, paye: number) {
  if (s <= 0) return { label: 'Soldé', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
  if (paye > 0) return { label: 'Partiel', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'En attente', bg: 'bg-gray-100', text: 'text-gray-500' }
}

type ChampTri = 'nom' | 'categorie' | 'solde' | 'date'
type SensTri = 'asc' | 'desc'

// ---- Modale Versements ----
function VersementsModal({ inscription, onFermer, onMaj }: { inscription: Inscription; onFermer: () => void; onMaj: () => void }) {
  const toast = useToast()
  const [versements, setVersements] = useState<Versement[]>([])
  const [chargement, setChargement] = useState(true)
  const [montant, setMontant] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [envoi, setEnvoi] = useState(false)

  async function charger() {
    setChargement(true)
    const { data, error } = await supabase
      .from('versements')
      .select('id,montant,date_versement')
      .eq('inscription_id', inscription.id)
      .order('date_versement', { ascending: false })
    if (!error && data) setVersements(data as Versement[])
    setChargement(false)
  }

  useEffect(() => { charger() }, [])

  async function ajouter() {
    const m = Number(montant)
    if (!Number.isFinite(m) || m <= 0) { toast.erreur('Montant invalide.'); return }
    setEnvoi(true)
    const { error } = await supabase.from('versements').insert({
      inscription_id: inscription.id,
      montant: m,
      date_versement: date ? new Date(date).toISOString() : new Date().toISOString(),
    })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Versement ajouté avec succès !')
    setMontant('')
    charger()
    onMaj()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onFermer}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-base font-bold text-[#1B3B1A]">Versements — {inscription.prenoms} {inscription.nom}</p>
          <button type="button" onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Total perçu : {formatFCFA(inscription.montant_paye)}</p>

        <div className="max-h-48 overflow-y-auto space-y-1.5 mb-4">
          {chargement ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : versements.length === 0 ? (
            <p className="text-sm text-gray-400">Aucun versement enregistré.</p>
          ) : versements.map(v => (
            <div key={v.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-[#F4F9F0]">
              <span className="text-[#1B3B1A] font-medium">{formatFCFA(v.montant)}</span>
              <span className="text-gray-400 text-xs">{new Date(v.date_versement).toLocaleDateString('fr-FR')}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-2">Ajouter un versement</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input type="number" min={1} value={montant} onChange={e => setMontant(e.target.value)}
              placeholder="Montant F CFA" className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" />
          </div>
          <button type="button" onClick={ajouter} disabled={envoi}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${envoi ? 'bg-gray-300' : 'bg-[#4F8A3D] hover:bg-[#3F7530]'}`}>
            {envoi ? 'Ajout...' : 'Ajouter le versement'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GestionInscriptions() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const toast = useToast()
  const [lignes, setLignes] = useState<Inscription[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [filtreCategorie, setFiltreCategorie] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('')
  const [page, setPage] = useState(1)
  const [champTri, setChampTri] = useState<ChampTri>('solde')
  const [sensTri, setSensTri] = useState<SensTri>('desc')
  const [editId, setEditId] = useState<string | null>(null)
  const [editReduction, setEditReduction] = useState('')
  const [versementsPour, setVersementsPour] = useState<Inscription | null>(null)
  const [confirmationSuppression, setConfirmationSuppression] = useState<string | null>(null)

  async function charger() {
    setChargement(true)
    const { data, error } = await supabase
      .from('inscriptions')
      .select('id,nom,prenoms,genre,categorie,telephone,ville,commune_quartier,taille_polo,contact_urgence_nom,contact_urgence_telephone,montant_du,montant_paye,reduction_accordee,date_inscription')
      .order('date_inscription', { ascending: false })
    if (!error && data) setLignes(data as Inscription[])
    setChargement(false)
  }

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces])

  // ---- Couleurs de regroupement familial (téléphones partagés) ----
  const couleursFamille = useMemo(() => {
    const compte: Record<string, number> = {}
    lignes.forEach(l => { compte[l.telephone] = (compte[l.telephone] || 0) + 1 })
    const carte: Record<string, string> = {}
    let idx = 0
    lignes.forEach(l => {
      if (compte[l.telephone] > 1 && !carte[l.telephone]) {
        carte[l.telephone] = COULEURS_FAMILLE[idx % COULEURS_FAMILLE.length]
        idx++
      }
    })
    return carte
  }, [lignes])

  // ---- Filtrage ----
  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return lignes.filter(l => {
      if (q && !(l.nom.toLowerCase().includes(q) || l.prenoms.toLowerCase().includes(q) || l.telephone.includes(q))) return false
      if (filtreCategorie && l.categorie !== filtreCategorie) return false
      if (filtreStatut) {
        const badge = statutBadge(solde(l), l.montant_paye ?? 0).label
        const labelFr = filtreStatut === 'attente' ? 'En attente' : filtreStatut === 'partiel' ? 'Partiel' : 'Soldé'
        if (badge !== labelFr) return false
      }
      return true
    })
  }, [lignes, recherche, filtreCategorie, filtreStatut])

  // ---- Statistiques (sur l'ensemble filtré) ----
  const stats = useMemo(() => {
    let totalDu = 0, totalPaye = 0, enAttente = 0, partiel = 0, solde_ = 0
    filtrees.forEach(l => {
      totalDu += l.montant_du ?? 0
      totalPaye += l.montant_paye ?? 0
      const s = solde(l)
      const badge = statutBadge(s, l.montant_paye ?? 0).label
      if (badge === 'Soldé') solde_++
      else if (badge === 'Partiel') partiel++
      else enAttente++
    })
    return { total: filtrees.length, totalDu, totalPaye, enAttente, partiel, solde: solde_ }
  }, [filtrees])

  // ---- Tri ----
  const triees = useMemo(() => {
    const copie = [...filtrees]
    copie.sort((a, b) => {
      let cmp = 0
      if (champTri === 'nom') cmp = `${a.prenoms} ${a.nom}`.localeCompare(`${b.prenoms} ${b.nom}`)
      else if (champTri === 'categorie') cmp = (a.categorie ?? '').localeCompare(b.categorie ?? '')
      else if (champTri === 'solde') cmp = solde(a) - solde(b)
      else if (champTri === 'date') cmp = new Date(a.date_inscription).getTime() - new Date(b.date_inscription).getTime()
      return sensTri === 'asc' ? cmp : -cmp
    })
    return copie
  }, [filtrees, champTri, sensTri])

  const totalPages = Math.max(1, Math.ceil(triees.length / PAR_PAGE))
  const pageBornee = Math.min(page, totalPages)
  const lignesPage = triees.slice((pageBornee - 1) * PAR_PAGE, pageBornee * PAR_PAGE)

  function trierPar(champ: ChampTri) {
    if (champTri === champ) setSensTri(s => (s === 'asc' ? 'desc' : 'asc'))
    else { setChampTri(champ); setSensTri('desc') }
    setPage(1)
  }

  function FlecheTri({ champ }: { champ: ChampTri }) {
    if (champTri !== champ) return null
    return <span className="ml-1">{sensTri === 'asc' ? '▲' : '▼'}</span>
  }

  function ouvrirEditionReduction(l: Inscription) {
    setEditId(l.id)
    setEditReduction(String(l.reduction_accordee ?? 0))
  }

  async function enregistrerReduction(id: string) {
    const reduction_accordee = Number(editReduction)
    if (!Number.isFinite(reduction_accordee) || reduction_accordee < 0) {
      toast.erreur('Montant de réduction invalide.')
      return
    }
    const { error } = await supabase.from('inscriptions').update({ reduction_accordee }).eq('id', id)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes('Réduction mise à jour avec succès !')
    setEditId(null)
    charger()
  }

  // Supprimer une inscription supprime aussi automatiquement ses versements
  // (suppression en cascade définie au niveau de la base de données).
  async function supprimerInscription(id: string) {
    setConfirmationSuppression(null)
    const { error } = await supabase.from('inscriptions').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Inscription supprimée avec succès.')
    charger()
  }

  // Lien de rappel WhatsApp pré-rempli, pour les inscriptions non soldées.
  function lienRappelWhatsApp(l: Inscription): string {
    const s = solde(l)
    const message =
      `Bonjour ${l.prenoms}, ceci est un rappel concernant votre inscription au Camp Biblique-Navs 2026. ` +
      `Solde restant à régler : ${formatFCFA(s)}. Merci de régulariser dès que possible. ` +
      `Mission Évangélique des Navigateurs CI.`
    return `https://wa.me/225${l.telephone}?text=${encodeURIComponent(message)}`
  }

  // ---- Export Excel (feuille Résumé + feuille Détail) ----
  async function exporterExcel() {
    const { utils, writeFileXLSX } = await import('xlsx')

    const totalDu = triees.reduce((s, l) => s + (l.montant_du ?? 0), 0)
    const totalReduction = triees.reduce((s, l) => s + (l.reduction_accordee ?? 0), 0)
    const totalPaye = triees.reduce((s, l) => s + (l.montant_paye ?? 0), 0)
    const totalSolde = triees.reduce((s, l) => s + solde(l), 0)
    const nbAdultes = triees.filter(l => l.categorie === 'Adulte/Ado 16+').length
    const nbEnfants = triees.filter(l => l.categorie === 'Enfant/Ado 15-').length

    const feuilleResume = utils.json_to_sheet([{
      'Camp': 'Camp Biblique-Navs 2026',
      'Généré le': new Date().toLocaleDateString('fr-FR'),
      'Nombre total d\'inscrits': triees.length,
      'dont Adultes/Ados 16+': nbAdultes,
      'dont Enfants/Ados 15-': nbEnfants,
      'En attente': stats.enAttente,
      'Paiement partiel': stats.partiel,
      'Soldé': stats.solde,
      'Total dû (F CFA)': totalDu,
      'Total réduction (F CFA)': totalReduction,
      'Total payé (F CFA)': totalPaye,
      'Total solde restant (F CFA)': totalSolde,
    }])

    const donnees = triees.map(l => ({
      Nom: l.nom, Prénoms: l.prenoms, Genre: l.genre ?? '', Catégorie: l.categorie ?? '',
      Téléphone: l.telephone, Ville: l.ville ?? '', 'Commune/Quartier': l.commune_quartier ?? '',
      'Taille Polo': l.taille_polo ?? '', 'Contact urgence': l.contact_urgence_nom ?? '',
      'Téléphone urgence': l.contact_urgence_telephone ?? '',
      'Montant dû (F CFA)': l.montant_du ?? 0, 'Réduction (F CFA)': l.reduction_accordee ?? 0,
      'Montant payé (F CFA)': l.montant_paye ?? 0, 'Solde (F CFA)': solde(l),
      Statut: statutBadge(solde(l), l.montant_paye ?? 0).label,
      "Date d'inscription": new Date(l.date_inscription).toLocaleDateString('fr-FR'),
    }))
    const feuilleDetail = utils.json_to_sheet(donnees)
    feuilleDetail['!cols'] = Object.keys(donnees[0] || {}).map(() => ({ wch: 18 }))

    // Feuille "Émargement" — volontairement allégée (aucune donnée
    // sensible : pas de contact d'urgence, pas de coordonnées), pour
    // un usage rapide en liste de présence simple.
    const lignesTrieesNom = [...triees].sort((a, b) => a.nom.localeCompare(b.nom))
    const feuilleEmargement = utils.json_to_sheet(
      lignesTrieesNom.map((l, i) => ({
        'N°': i + 1, Nom: l.nom, Prénoms: l.prenoms, Catégorie: l.categorie ?? '', Téléphone: l.telephone,
      }))
    )
    feuilleEmargement['!cols'] = [{ wch: 5 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 16 }]

    const classeur = utils.book_new()
    utils.book_append_sheet(classeur, feuilleResume, 'Résumé')
    utils.book_append_sheet(classeur, feuilleDetail, 'Inscriptions')
    utils.book_append_sheet(classeur, feuilleEmargement, 'Émargement')
    writeFileXLSX(classeur, `inscriptions_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ---- Export PDF (résumé financier + émargement) ----
  async function exporterPDF() {
    const { default: jsPDF } = await import('jspdf')
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF()

    const totalDu = triees.reduce((s, l) => s + (l.montant_du ?? 0), 0)
    const totalPaye = triees.reduce((s, l) => s + (l.montant_paye ?? 0), 0)
    const totalSolde = triees.reduce((s, l) => s + solde(l), 0)

    doc.setFontSize(13)
    doc.text('Mission Évangélique des Navigateurs CI', 14, 15)
    doc.setFontSize(11)
    doc.text('Rapport des inscriptions — Camp Biblique-Navs 2026', 14, 22)
    doc.setFontSize(9)
    doc.text('23 – 29 août 2026 · La Sablière, Bingerville', 14, 28)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} · ${triees.length} inscrit(s)`, 14, 33)

    autoTable(doc, {
      startY: 40,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Total dû', formatFCFA(totalDu)],
        ['Total payé', formatFCFA(totalPaye)],
        ['Total solde restant', formatFCFA(totalSolde)],
        ['En attente / Partiel / Soldé', `${stats.enAttente} / ${stats.partiel} / ${stats.solde}`],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 59, 26] },
    })

    // Émargement paginé à 12 noms par page imprimée, pour rester
    // lisible et facile à faire signer en personne.
    const PAR_PAGE_EMARGEMENT = 12
    const lignesTriees = [...triees].sort((a, b) => a.nom.localeCompare(b.nom))
    const nbPagesEmargement = Math.max(1, Math.ceil(lignesTriees.length / PAR_PAGE_EMARGEMENT))

    for (let page = 0; page < nbPagesEmargement; page++) {
      doc.addPage()
      const debut = page * PAR_PAGE_EMARGEMENT
      const lot = lignesTriees.slice(debut, debut + PAR_PAGE_EMARGEMENT)

      doc.setFontSize(11)
      doc.text("Liste d'émargement — Camp Biblique-Navs 2026", 14, 15)
      doc.setFontSize(8)
      doc.text(`Page ${page + 1} / ${nbPagesEmargement}`, 14, 20)

      autoTable(doc, {
        startY: 26,
        head: [['N°', 'Nom', 'Prénoms', 'Catégorie', 'Téléphone', 'Signature']],
        body: lot.map((l, i) => [String(debut + i + 1), l.nom, l.prenoms, l.categorie ?? '', l.telephone, '']),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [27, 59, 26] },
        columnStyles: { 5: { cellWidth: 35 } },
      })
    }
    doc.save(`rapport_inscriptions_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.pdf`)
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
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-[#1B3B1A]">Gestion des inscriptions</h1>
          <div className="flex gap-2">
            <button type="button" onClick={exporterExcel}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]">
              Exporter en Excel
            </button>
            <button type="button" onClick={exporterPDF}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#E7F2DE]">
              Télécharger le PDF
            </button>
          </div>
        </div>

        {/* ---- Cartes statistiques ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
            <p className="text-xs text-gray-400">Inscrits</p>
            <p className="text-xl font-bold text-[#1B3B1A] mt-1">{chargement ? '—' : stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
            <p className="text-xs text-gray-400">Montant attendu</p>
            <p className="text-xl font-bold text-[#1B3B1A] mt-1">{chargement ? '—' : formatFCFA(stats.totalDu)}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
            <p className="text-xs text-gray-400">Montant perçu</p>
            <p className="text-xl font-bold text-[#4F8A3D] mt-1">{chargement ? '—' : formatFCFA(stats.totalPaye)}</p>
          </div>
          <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1.5">Statuts</p>
            <div className="flex gap-2 text-xs font-semibold">
              <span className="text-gray-500">{stats.enAttente} attente</span>
              <span className="text-[#8A6A23]">{stats.partiel} partiel</span>
              <span className="text-[#4F8A3D]">{stats.solde} soldé</span>
            </div>
          </div>
        </div>

        {/* ---- Filtres ---- */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            value={recherche}
            onChange={e => { setRecherche(e.target.value); setPage(1) }}
            placeholder="Rechercher par nom, prénoms ou téléphone..."
            className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          />
          <select value={filtreCategorie} onChange={e => { setFiltreCategorie(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Toutes catégories</option>
            <option value="Adulte/Ado 16+">Adulte/Ado 16+</option>
            <option value="Enfant/Ado 15-">Enfant/Ado 15-</option>
          </select>
          <select value={filtreStatut} onChange={e => { setFiltreStatut(e.target.value); setPage(1) }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Tous statuts</option>
            <option value="attente">En attente</option>
            <option value="partiel">Partiel</option>
            <option value="solde">Soldé</option>
          </select>
        </div>

        {/* ---- Tableau ---- */}
        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => trierPar('nom')}>Nom &amp; Prénoms<FlecheTri champ="nom" /></th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => trierPar('categorie')}>Catégorie<FlecheTri champ="categorie" /></th>
                <th className="px-4 py-3 font-medium">Téléphone</th>
                <th className="px-4 py-3 font-medium">Ville</th>
                <th className="px-4 py-3 font-medium">Polo</th>
                <th className="px-4 py-3 font-medium">Dû</th>
                <th className="px-4 py-3 font-medium">Réduction</th>
                <th className="px-4 py-3 font-medium">Payé</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => trierPar('solde')}>Solde<FlecheTri champ="solde" /></th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none" onClick={() => trierPar('date')}>Date<FlecheTri champ="date" /></th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F2DE]">
              {chargement ? (
                <SkeletonTableau lignes={6} colonnes={12} />
              ) : lignesPage.length === 0 ? (
                <tr><td colSpan={12} className="px-4 py-6 text-center text-gray-400">Aucune inscription trouvée.</td></tr>
              ) : (
                lignesPage.map(l => {
                  const s = solde(l)
                  const badge = statutBadge(s, l.montant_paye ?? 0)
                  const enEdition = editId === l.id
                  const couleurFamille = couleursFamille[l.telephone]
                  return (
                    <tr key={l.id} className="text-[#1B3B1A]" style={couleurFamille ? { borderLeft: `4px solid ${couleurFamille}` } : undefined}>
                      <td className="px-4 py-3 font-medium">{l.prenoms} {l.nom}</td>
                      <td className="px-4 py-3 text-gray-500">{l.categorie ?? '—'}</td>
                      <td className="px-4 py-3">
                        <a href={`tel:+225${l.telephone}`} className="text-[#4F8A3D] hover:underline">{l.telephone}</a>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{l.ville ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{l.taille_polo ?? '—'}</td>
                      <td className="px-4 py-3">{formatFCFA(l.montant_du)}</td>
                      <td className="px-4 py-3">
                        {enEdition ? (
                          <input type="number" min={0} value={editReduction} onChange={e => setEditReduction(e.target.value)}
                            className="w-24 rounded border border-gray-300 px-2 py-1 text-sm" />
                        ) : formatFCFA(l.reduction_accordee)}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatFCFA(l.montant_paye)}</td>
                      <td className="px-4 py-3 font-semibold">{formatFCFA(s)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(l.date_inscription).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 items-center">
                          {enEdition ? (
                            <>
                              <button type="button" onClick={() => enregistrerReduction(l.id)} className="text-xs font-semibold text-[#4F8A3D] hover:underline">Enregistrer</button>
                              <button type="button" onClick={() => setEditId(null)} className="text-xs text-gray-400 hover:underline">Annuler</button>
                            </>
                          ) : (
                            <button type="button" onClick={() => ouvrirEditionReduction(l)} className="text-xs font-semibold text-[#5B7A56] hover:underline">Réduction</button>
                          )}
                          <button type="button" onClick={() => setVersementsPour(l)} className="text-xs font-semibold text-[#1B3B1A] hover:underline">Versements</button>
                          {s > 0 && (
                            <a href={lienRappelWhatsApp(l)} target="_blank" rel="noopener noreferrer" title="Envoyer un rappel WhatsApp" className="text-[#4F8A3D] hover:text-[#3F7530]">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.94.55 3.76 1.5 5.31L2 22l4.94-1.6a9.84 9.84 0 005.1 1.4h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm5.78 14.02c-.25.7-1.45 1.36-1.98 1.43-.5.07-1.13.1-1.83-.12-.42-.13-.96-.31-1.65-.6-2.9-1.25-4.78-4.17-4.93-4.37-.14-.2-1.18-1.57-1.18-2.99 0-1.42.74-2.12 1-2.41.26-.29.57-.36.76-.36.19 0 .38 0 .55.01.18.01.41-.07.64.49.25.6.83 2.07.9 2.22.07.15.12.33.02.53-.1.2-.15.32-.3.49-.15.17-.31.38-.44.5-.15.14-.3.29-.13.57.18.28.79 1.31 1.7 2.12 1.17 1.04 2.16 1.37 2.47 1.52.31.15.49.13.67-.05.18-.18.78-.9.99-1.21.21-.31.42-.26.7-.16.28.1 1.79.84 2.1.99.31.15.51.23.59.36.08.13.08.74-.17 1.44z" />
                              </svg>
                            </a>
                          )}
                          {confirmationSuppression === l.id ? (
                            <button type="button" onClick={() => supprimerInscription(l.id)} className="text-xs font-bold text-white bg-[#B3492F] px-2 py-1 rounded-md">
                              Confirmer ?
                            </button>
                          ) : (
                            <button type="button" onClick={() => setConfirmationSuppression(l.id)} title="Supprimer" className="text-[#B3492F] hover:text-[#8a3722]">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageBornee === 1}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${pageBornee === 1 ? 'text-gray-300' : 'text-[#1B3B1A] hover:bg-[#E7F2DE]'}`}>
              Précédent
            </button>
            <span className="text-sm text-gray-500">Page {pageBornee} / {totalPages}</span>
            <button type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageBornee === totalPages}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${pageBornee === totalPages ? 'text-gray-300' : 'text-[#1B3B1A] hover:bg-[#E7F2DE]'}`}>
              Suivant
            </button>
          </div>
        )}
      </div>

      {versementsPour && (
        <VersementsModal
          inscription={versementsPour}
          onFermer={() => setVersementsPour(null)}
          onMaj={charger}
        />
      )}
    </div>
  )
}

import { utils, writeFileXLSX } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================================
// Camp Biblique-Navs 2026 — Exports Trésorerie (Phase 3, Étape 4)
// Génération 100% côté client : aucun serveur, aucune limite de temps.
// ============================================================

export interface TransactionExport {
  date_mouvement: string
  type: 'entree' | 'sortie'
  categorie: string
  detail: string | null
  montant: number
}

const LIBELLES_CATEGORIE: Record<string, string> = {
  participation: 'Frais de participation',
  don_interne: 'Don interne (Navigateurs)',
  don_externe: 'Don externe',
  solde_passe: 'Solde du camp passé',
  vente_gadgets: 'Vente de Polo/Gadgets',
  subvention: 'Subvention du ministère',
  depense_logistique: 'Logistique',
  depense_sante: 'Santé',
  depense_alimentation: 'Alimentation',
  depense_transport: 'Transport',
  depense_communication: 'Communication',
  autre: 'Autre',
}

function formatFCFA(montant: number) {
  return Math.round(montant).toLocaleString('fr-FR') + ' F CFA'
}

function formatDateFr(dateISO: string) {
  return new Date(dateISO).toLocaleDateString('fr-FR')
}

// ---- Export Excel (.xlsx) ----
export function exportToExcel(transactions: TransactionExport[]) {
  const lignes = transactions.map(t => ({
    Date: formatDateFr(t.date_mouvement),
    Type: t.type === 'entree' ? 'Entrée' : 'Sortie',
    Catégorie: LIBELLES_CATEGORIE[t.categorie] ?? t.categorie,
    Détail: t.detail ?? '',
    'Montant (F CFA)': t.type === 'entree' ? t.montant : -t.montant,
  }))

  const feuille = utils.json_to_sheet(lignes)
  feuille['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 38 }, { wch: 16 }]

  const classeur = utils.book_new()
  utils.book_append_sheet(classeur, feuille, 'Grand Livre')

  const nomFichier = `Grand_Livre_Tresorerie_${new Date().toISOString().slice(0, 10)}.xlsx`
  writeFileXLSX(classeur, nomFichier)
}

// ---- Rapport financier officiel (PDF) ----
export function generatePDF(transactions: TransactionExport[], soldeFinal: number) {
  const doc = new jsPDF()
  const dateGeneration = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Mission Évangélique des Navigateurs CI', 14, 18)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Rapport Financier Officiel — Camp Biblique-Navs 2026', 14, 26)
  doc.setTextColor(120)
  doc.text(`Généré le ${dateGeneration}`, 14, 32)
  doc.setTextColor(0)

  const lignes = transactions.map(t => [
    formatDateFr(t.date_mouvement),
    t.type === 'entree' ? 'Entrée' : 'Sortie',
    LIBELLES_CATEGORIE[t.categorie] ?? t.categorie,
    t.detail ?? '',
    (t.type === 'entree' ? '+ ' : '- ') + formatFCFA(t.montant),
  ])

  autoTable(doc, {
    startY: 38,
    head: [['Date', 'Type', 'Catégorie', 'Détail', 'Montant']],
    body: lignes,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [27, 59, 26] }, // vert-forêt de la charte
    columnStyles: { 4: { halign: 'right' } },
  })

  // jspdf-autotable attache "lastAutoTable" à l'instance du document
  // (non typé officiellement, d'où le contournement ci-dessous).
  const docAvecTable = doc as jsPDF & { lastAutoTable: { finalY: number } }
  const yFinal = docAvecTable.lastAutoTable.finalY + 10

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(`Solde final : ${formatFCFA(soldeFinal)}`, 14, yFinal)

  const nomFichier = `Rapport_Financier_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(nomFichier)
}

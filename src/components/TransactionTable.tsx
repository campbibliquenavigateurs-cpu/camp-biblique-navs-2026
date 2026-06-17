import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Transaction {
  id: string
  type: 'entree' | 'sortie'
  categorie: string
  detail: string | null
  montant: number
  date_mouvement: string
}

type Tri = 'date_mouvement' | 'montant'

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

const TAILLE_PAGE = 10

function formatFCFA(montant: number) {
  return Math.round(montant).toLocaleString('fr-FR') + ' F CFA'
}

interface TransactionTableProps {
  refreshKey: number
}

export default function TransactionTable({ refreshKey }: TransactionTableProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [tri, setTri] = useState<Tri>('date_mouvement')
  const [ordreAscendant, setOrdreAscendant] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [messageExport, setMessageExport] = useState('')

  const chargerTransactions = useCallback(async () => {
    setChargement(true)
    const debut = page * TAILLE_PAGE
    const fin = debut + TAILLE_PAGE - 1

    const { data, count, error } = await supabase
      .from('tresorerie')
      .select('*', { count: 'exact' })
      .order(tri, { ascending: ordreAscendant })
      .range(debut, fin)

    if (!error) {
      setTransactions((data ?? []) as Transaction[])
      setTotal(count ?? 0)
    }
    setChargement(false)
  }, [page, tri, ordreAscendant])

  useEffect(() => {
    chargerTransactions()
  }, [chargerTransactions, refreshKey])

  function changerTri(colonne: Tri) {
    if (tri === colonne) {
      setOrdreAscendant(a => !a)
    } else {
      setTri(colonne)
      setOrdreAscendant(false)
    }
    setPage(0)
  }

  // Les deux boutons ci-dessous sont simulés pour le moment, comme demandé :
  // le micro-service Node.js de génération réelle (Excel/PDF) sera branché ensuite.
  function exporterExcel() {
    console.log('Export Excel demandé — à brancher sur le micro-service de génération.')
    setMessageExport('Export Excel simulé (micro-service à venir).')
    setTimeout(() => setMessageExport(''), 3000)
  }

  function genererRapportPDF() {
    console.log('Génération PDF demandée — à brancher sur le micro-service de génération.')
    setMessageExport('Génération PDF simulée (micro-service à venir).')
    setTimeout(() => setMessageExport(''), 3000)
  }

  const totalPages = Math.max(1, Math.ceil(total / TAILLE_PAGE))

  function FlecheTri({ colonne }: { colonne: Tri }) {
    if (tri !== colonne) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-[#4F8A3D] ml-1">{ordreAscendant ? '↑' : '↓'}</span>
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-gray-100">
        <p className="text-sm font-semibold text-[#1B3B1A]">Historique des mouvements</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exporterExcel}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-[#4F8A3D] text-[#4F8A3D] hover:bg-[#E7F2DE] transition-colors duration-200"
          >
            Exporter le Grand Livre (Excel)
          </button>
          <button
            type="button"
            onClick={genererRapportPDF}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1B3B1A] text-white hover:bg-[#15300F] transition-colors duration-200"
          >
            Générer le Rapport Financier Officiel (PDF)
          </button>
        </div>
      </div>

      {messageExport && (
        <p className="text-xs text-[#5B7A56] bg-[#F4F9F0] px-5 py-2 border-b border-gray-100">{messageExport}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-5 py-3 cursor-pointer select-none" onClick={() => changerTri('date_mouvement')}>
                Date <FlecheTri colonne="date_mouvement" />
              </th>
              <th className="px-5 py-3">Catégorie</th>
              <th className="px-5 py-3">Détail</th>
              <th className="px-5 py-3 text-right cursor-pointer select-none" onClick={() => changerTri('montant')}>
                Montant <FlecheTri colonne="montant" />
              </th>
            </tr>
          </thead>
          <tbody>
            {chargement ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400 text-sm">Chargement...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-gray-400 text-sm">Aucun mouvement enregistré.</td>
              </tr>
            ) : (
              transactions.map(t => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0 hover:bg-[#F4F9F0]/60">
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(t.date_mouvement).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-5 py-3 text-[#1B3B1A]">{LIBELLES_CATEGORIE[t.categorie] ?? t.categorie}</td>
                  <td className="px-5 py-3 text-gray-500">{t.detail}</td>
                  <td
                    className={`px-5 py-3 text-right font-semibold whitespace-nowrap ${
                      t.type === 'entree' ? 'text-[#4F8A3D]' : 'text-[#B3492F]'
                    }`}
                  >
                    {t.type === 'entree' ? '+ ' : '- '}{formatFCFA(t.montant)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className={`text-sm font-medium ${page === 0 ? 'text-gray-300' : 'text-[#1B3B1A] hover:underline'}`}
        >
          Précédent
        </button>
        <p className="text-xs text-gray-400">Page {page + 1} sur {totalPages}</p>
        <button
          type="button"
          onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
          disabled={page >= totalPages - 1}
          className={`text-sm font-medium ${page >= totalPages - 1 ? 'text-gray-300' : 'text-[#1B3B1A] hover:underline'}`}
        >
          Suivant
        </button>
      </div>
    </div>
  )
}

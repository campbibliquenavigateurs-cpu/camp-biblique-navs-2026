import { useState } from 'react'
import { supabase } from '../lib/supabase'

type TypeMouvement = 'entree' | 'sortie'

const CATEGORIES_ENTREE = [
  { value: 'participation', label: 'Frais de participation' },
  { value: 'don_interne', label: 'Don interne (Navigateurs)' },
  { value: 'don_externe', label: 'Don externe' },
  { value: 'solde_passe', label: 'Solde du camp passé' },
  { value: 'vente_gadgets', label: 'Vente de Polo/Gadgets' },
  { value: 'subvention', label: 'Subvention du ministère' },
  { value: 'autre', label: 'Autre' },
] as const

const CATEGORIES_SORTIE = [
  { value: 'depense_logistique', label: 'Logistique' },
  { value: 'depense_sante', label: 'Santé' },
  { value: 'depense_alimentation', label: 'Alimentation' },
  { value: 'depense_transport', label: 'Transport' },
  { value: 'depense_communication', label: 'Communication' },
  { value: 'autre', label: 'Autre' },
] as const

interface TransactionFormProps {
  profilId: string | null
  onAjout: () => void
}

export default function TransactionForm({ profilId, onAjout }: TransactionFormProps) {
  const [type, setType] = useState<TypeMouvement>('entree')
  const [categorie, setCategorie] = useState('')
  const [montant, setMontant] = useState('')
  const [detail, setDetail] = useState('')
  const [dateMouvement, setDateMouvement] = useState(() => new Date().toISOString().slice(0, 10))
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [message, setMessage] = useState('')

  const categories = type === 'entree' ? CATEGORIES_ENTREE : CATEGORIES_SORTIE

  function changerType(nouveauType: TypeMouvement) {
    setType(nouveauType)
    setCategorie('') // évite une catégorie incohérente avec le nouveau type
  }

  const formulaireValide =
    categorie !== '' && Number(montant) > 0 && detail.trim() !== '' && dateMouvement !== ''

  async function soumettre() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)
    setMessage('')

    const { error } = await supabase.from('tresorerie').insert({
      type,
      categorie,
      detail: detail.trim(),
      montant: Number(montant),
      date_mouvement: dateMouvement,
      cree_par: profilId,
    })

    setEnvoiEnCours(false)

    if (error) {
      setMessage("Erreur lors de l'enregistrement. Merci de réessayer.")
      console.error(error)
      return
    }

    setMessage('Mouvement enregistré avec succès.')
    setCategorie('')
    setMontant('')
    setDetail('')
    onAjout()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 sm:p-6">
      <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Enregistrer un mouvement</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          type="button"
          onClick={() => changerType('entree')}
          className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all duration-200 ${
            type === 'entree'
              ? 'border-[#4F8A3D] bg-[#E7F2DE] text-[#1B3B1A]'
              : 'border-gray-200 text-gray-500 hover:border-[#9CC18F]'
          }`}
        >
          Entrée
        </button>
        <button
          type="button"
          onClick={() => changerType('sortie')}
          className={`rounded-xl border-2 py-2.5 text-sm font-semibold transition-all duration-200 ${
            type === 'sortie'
              ? 'border-[#B3492F] bg-[#B3492F]/10 text-[#B3492F]'
              : 'border-gray-200 text-gray-500 hover:border-[#D9A48C]'
          }`}
        >
          Sortie
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Catégorie</label>
          <select
            value={categorie}
            onChange={e => setCategorie(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          >
            <option value="">Sélectionner...</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Montant (F CFA)</label>
          <input
            type="number"
            min={0}
            value={montant}
            onChange={e => setMontant(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Ex : 50000"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Détail / Libellé</label>
        <input
          type="text"
          value={detail}
          onChange={e => setDetail(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          placeholder="Ex : Achat de gaz pour la cuisine"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Date du mouvement</label>
        <input
          type="date"
          value={dateMouvement}
          onChange={e => setDateMouvement(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
        />
      </div>

      {message && (
        <p className={`text-sm mb-3 ${message.startsWith('Erreur') ? 'text-[#B3492F]' : 'text-[#4F8A3D]'}`}>
          {message}
        </p>
      )}

      <button
        type="button"
        onClick={soumettre}
        disabled={!formulaireValide || envoiEnCours}
        className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
          formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {envoiEnCours ? 'Enregistrement...' : 'Enregistrer le mouvement'}
      </button>
    </div>
  )
}

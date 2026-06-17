import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Membre {
  id: string
  nom: string
  prenoms: string
}

interface MaterielFormProps {
  onAjout: () => void
}

export default function MaterielForm({ onAjout }: MaterielFormProps) {
  const [designation, setDesignation] = useState('')
  const [quantiteDepart, setQuantiteDepart] = useState('')
  const [responsable, setResponsable] = useState('')
  const [equipe, setEquipe] = useState<Membre[]>([])
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function chargerEquipe() {
      const { data, error } = await supabase.rpc('lister_equipe', {
        roles: ['admin', 'comite_logistique'],
      })
      if (!error && data) setEquipe(data as Membre[])
    }
    chargerEquipe()
  }, [])

  const formulaireValide = designation.trim() !== '' && Number(quantiteDepart) > 0

  async function soumettre() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)
    setMessage('')

    const { error } = await supabase.from('logistique').insert({
      designation: designation.trim(),
      quantite_depart: Number(quantiteDepart),
      quantite_retour: null,
      etat: null,
      responsable: responsable || null,
    })

    setEnvoiEnCours(false)

    if (error) {
      setMessage("Erreur lors de l'enregistrement. Merci de réessayer.")
      console.error(error)
      return
    }

    setDesignation('')
    setQuantiteDepart('')
    setResponsable('')
    onAjout()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
      <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Ajouter du matériel</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="sm:col-span-1">
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Désignation</label>
          <input
            type="text"
            value={designation}
            onChange={e => setDesignation(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Ex : Tente 4 places"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Quantité au départ</label>
          <input
            type="number"
            min={1}
            value={quantiteDepart}
            onChange={e => setQuantiteDepart(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Ex : 10"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Responsable</label>
          <select
            value={responsable}
            onChange={e => setResponsable(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          >
            <option value="">Non assigné</option>
            {equipe.map(membre => (
              <option key={membre.id} value={membre.id}>{membre.prenoms} {membre.nom}</option>
            ))}
          </select>
        </div>
      </div>

      {message && <p className="text-sm text-[#B3492F] mb-3">{message}</p>}

      <button
        type="button"
        onClick={soumettre}
        disabled={!formulaireValide || envoiEnCours}
        className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
          formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {envoiEnCours ? 'Ajout...' : 'Ajouter'}
      </button>
    </div>
  )
}

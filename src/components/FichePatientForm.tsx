import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface SuggestionCampeur {
  id: string
  nom: string
  prenoms: string
}

interface FichePatientFormProps {
  profilId: string | null
  onAjout: () => void
}

export default function FichePatientForm({ profilId, onAjout }: FichePatientFormProps) {
  const [nomMalade, setNomMalade] = useState('')
  const [inscriptionId, setInscriptionId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<SuggestionCampeur[]>([])
  const [afficherSuggestions, setAfficherSuggestions] = useState(false)
  const [symptomes, setSymptomes] = useState('')
  const [traitement, setTraitement] = useState('')
  const [materielUtilise, setMaterielUtilise] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [message, setMessage] = useState('')

  async function rechercherCampeur(texte: string) {
    setNomMalade(texte)
    setInscriptionId(null) // toute frappe invalide la sélection précédente

    if (texte.trim().length < 2) {
      setSuggestions([])
      setAfficherSuggestions(false)
      return
    }

    const { data, error } = await supabase.rpc('rechercher_campeurs', { recherche: texte.trim() })
    if (!error && data) {
      setSuggestions(data as SuggestionCampeur[])
      setAfficherSuggestions(true)
    }
  }

  function choisirSuggestion(suggestion: SuggestionCampeur) {
    setNomMalade(`${suggestion.prenoms} ${suggestion.nom}`)
    setInscriptionId(suggestion.id)
    setSuggestions([])
    setAfficherSuggestions(false)
  }

  const formulaireValide = nomMalade.trim() !== '' && symptomes.trim() !== ''

  async function soumettre() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)
    setMessage('')

    const { error } = await supabase.from('sante').insert({
      inscription_id: inscriptionId,
      nom_malade: nomMalade.trim(),
      symptomes: symptomes.trim(),
      traitement_administre: traitement.trim() || null,
      materiel_medical_utilise: materielUtilise.trim() || null,
      suivi_par: profilId,
    })

    setEnvoiEnCours(false)

    if (error) {
      setMessage("Erreur lors de l'enregistrement. Merci de réessayer.")
      console.error(error)
      return
    }

    setNomMalade('')
    setInscriptionId(null)
    setSymptomes('')
    setTraitement('')
    setMaterielUtilise('')
    onAjout()
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
      <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Nouvelle fiche patient</p>

      <div className="relative mb-4">
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom du malade</label>
        <input
          type="text"
          value={nomMalade}
          onChange={e => rechercherCampeur(e.target.value)}
          onFocus={() => suggestions.length > 0 && setAfficherSuggestions(true)}
          onBlur={() => setTimeout(() => setAfficherSuggestions(false), 150)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          placeholder="Rechercher un campeur inscrit ou saisir un nom"
        />
        {inscriptionId && (
          <p className="text-xs text-[#4F8A3D] mt-1">✓ Lié à une inscription du camp</p>
        )}
        {afficherSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-md mt-1 max-h-48 overflow-y-auto">
            {suggestions.map(s => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => choisirSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[#F4F9F0] text-[#1B3B1A]"
                >
                  {s.prenoms} {s.nom}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Symptômes</label>
        <textarea
          value={symptomes}
          onChange={e => setSymptomes(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          placeholder="Ex : Fièvre, maux de tête"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Traitement administré</label>
        <textarea
          value={traitement}
          onChange={e => setTraitement(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          placeholder="Ex : Paracétamol 500mg"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Matériel / médicament utilisé</label>
        <input
          type="text"
          value={materielUtilise}
          onChange={e => setMaterielUtilise(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          placeholder="Ex : 2 comprimés, 1 pansement"
        />
      </div>

      {message && <p className="text-sm text-[#B3492F] mb-3">{message}</p>}

      <button
        type="button"
        onClick={soumettre}
        disabled={!formulaireValide || envoiEnCours}
        className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
          formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {envoiEnCours ? 'Enregistrement...' : 'Enregistrer la fiche'}
      </button>
    </div>
  )
}

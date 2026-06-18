import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Évaluation du camp (Phase 3, Étape 5)
// Soumission publique, ouverte à tous (RLS Phase 2 :
// "evaluations_insert_public" with check (true)).
// ============================================================

type Critere = 'enseignements' | 'logistique' | 'restauration' | 'ambiance'

const CRITERES: { cle: Critere; label: string }[] = [
  { cle: 'enseignements', label: 'Enseignements / Ateliers' },
  { cle: 'logistique', label: 'Logistique / Logement' },
  { cle: 'restauration', label: 'Restauration' },
  { cle: 'ambiance', label: 'Ambiance générale' },
]

function Etoile({ remplie, onClick }: { remplie: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="p-0.5">
      <svg
        viewBox="0 0 24 24"
        className={`w-7 h-7 transition-colors duration-150 ${remplie ? 'text-[#D9A441]' : 'text-gray-200'}`}
        fill="currentColor"
      >
        <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8L5.7 21l1.7-7-5.4-4.7 7.1-.6L12 2z" />
      </svg>
    </button>
  )
}

export default function EvaluationForm() {
  const [notes, setNotes] = useState<Record<Critere, number>>({
    enseignements: 0,
    logistique: 0,
    restauration: 0,
    ambiance: 0,
  })
  const [suggestions, setSuggestions] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [confirmation, setConfirmation] = useState(false)

  function noter(critere: Critere, valeur: number) {
    setNotes(prev => ({ ...prev, [critere]: valeur }))
  }

  const formulaireValide = CRITERES.every(c => notes[c.cle] >= 1)

  async function soumettre() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)

    const { error } = await supabase.from('evaluations').insert({
      note_enseignements: notes.enseignements,
      note_logistique: notes.logistique,
      note_restauration: notes.restauration,
      note_ambiance: notes.ambiance,
      commentaire: suggestions.trim() || null,
    })

    setEnvoiEnCours(false)
    if (!error) setConfirmation(true)
  }

  if (confirmation) {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-[#E7F2DE]">
          <p className="text-[#4F8A3D] font-semibold text-lg mb-2">Merci pour ton retour 🙏</p>
          <p className="text-sm text-gray-500">
            Ton évaluation aide l'équipe à améliorer les prochaines éditions du camp.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-1 text-center">Évalue le camp</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Ton avis compte pour les prochaines éditions</p>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-6 space-y-5">
          {CRITERES.map(critere => (
            <div key={critere.cle} className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#1B3B1A]">{critere.label}</span>
              <div className="flex">
                {[1, 2, 3, 4, 5].map(valeur => (
                  <Etoile
                    key={valeur}
                    remplie={valeur <= notes[critere.cle]}
                    onClick={() => noter(critere.cle, valeur)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">
              Vos suggestions pour les prochaines éditions
            </label>
            <textarea
              value={suggestions}
              onChange={e => setSuggestions(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="Ce qu'on pourrait améliorer..."
            />
          </div>

          <button
            type="button"
            onClick={soumettre}
            disabled={!formulaireValide || envoiEnCours}
            className={`w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
              formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {envoiEnCours ? 'Envoi...' : 'Envoyer mon évaluation'}
          </button>
        </div>
      </div>
    </div>
  )
}

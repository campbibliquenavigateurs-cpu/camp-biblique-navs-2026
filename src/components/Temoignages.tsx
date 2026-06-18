import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Témoignages (Phase 3, Étape 5)
// Lecture publique limitée aux témoignages approuvés (RLS Phase 2 :
// "temoignages_select" using (approuve = true or admin)).
// Soumission ouverte à tous, y compris anonyme.
// ============================================================

interface Temoignage {
  id: string
  auteur_nom: string | null
  contenu: string
  created_at: string
}

export default function Temoignages() {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([])
  const [chargement, setChargement] = useState(true)
  const [auteurNom, setAuteurNom] = useState('')
  const [contenu, setContenu] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [confirmation, setConfirmation] = useState(false)

  async function charger() {
    const { data, error } = await supabase
      .from('temoignages')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setTemoignages(data as Temoignage[])
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  const formulaireValide = contenu.trim() !== ''

  async function soumettre() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)

    const { error } = await supabase.from('temoignages').insert({
      auteur_nom: auteurNom.trim() || null,
      contenu: contenu.trim(),
      // "approuve" reste à sa valeur par défaut (false = en attente de modération)
    })

    setEnvoiEnCours(false)
    if (!error) {
      setAuteurNom('')
      setContenu('')
      setConfirmation(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-[#1B3B1A] text-center">Témoignages édifiants</h1>

        {/* Formulaire de soumission */}
        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 max-w-xl mx-auto">
          {confirmation ? (
            <div className="text-center py-4">
              <p className="text-[#4F8A3D] font-semibold">Merci pour ton témoignage 🙏</p>
              <p className="text-sm text-gray-500 mt-1">
                Il sera visible sur cette page après validation par l'équipe.
              </p>
              <button
                type="button"
                onClick={() => setConfirmation(false)}
                className="text-sm text-[#5B7A56] hover:underline mt-3"
              >
                Soumettre un autre témoignage
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Partager ton témoignage</p>
              <div className="mb-3">
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">
                  Nom ou pseudo <span className="text-gray-400 font-normal">(optionnel — laisse vide pour rester anonyme)</span>
                </label>
                <input
                  type="text"
                  value={auteurNom}
                  onChange={e => setAuteurNom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                  placeholder="Ex : Sarah K."
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Ton message</label>
                <textarea
                  value={contenu}
                  onChange={e => setContenu(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                  placeholder="Ce que ce camp a représenté pour toi..."
                />
              </div>
              <button
                type="button"
                onClick={soumettre}
                disabled={!formulaireValide || envoiEnCours}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
                  formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {envoiEnCours ? 'Envoi...' : 'Envoyer'}
              </button>
            </>
          )}
        </div>

        {/* Mur de témoignages — disposition "masonry" via colonnes CSS */}
        {chargement ? (
          <p className="text-center text-sm text-gray-400">Chargement...</p>
        ) : temoignages.length === 0 ? (
          <p className="text-center text-sm text-gray-400">Aucun témoignage publié pour le moment.</p>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 [column-fill:_balance]">
            {temoignages.map(t => (
              <div
                key={t.id}
                className="break-inside-avoid mb-4 bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5"
              >
                <p className="text-[#4F8A3D] text-2xl leading-none mb-1">"</p>
                <p className="text-sm text-gray-700">{t.contenu}</p>
                <p className="text-xs text-gray-400 mt-3 font-medium">— {t.auteur_nom || 'Anonyme'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

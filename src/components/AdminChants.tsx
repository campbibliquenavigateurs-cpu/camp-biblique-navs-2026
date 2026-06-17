import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Back-office Chants (Phase 3, Étape 4)
// Réservé au rôle : admin
// ============================================================

const ROLES_ADMIN = ['admin'] as const

interface Chant {
  id: string
  titre: string
  auteur: string | null
  lien_audio: string | null
  paroles: string | null
}

export default function AdminChants() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const [chants, setChants] = useState<Chant[]>([])
  const [titre, setTitre] = useState('')
  const [auteur, setAuteur] = useState('')
  const [lienAudio, setLienAudio] = useState('')
  const [paroles, setParoles] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from('chants').select('*').order('titre', { ascending: true })
    if (!error && data) setChants(data as Chant[])
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const formulaireValide = titre.trim() !== ''

  async function ajouter() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)
    const { error } = await supabase.from('chants').insert({
      titre: titre.trim(),
      auteur: auteur.trim() || null,
      lien_audio: lienAudio.trim() || null,
      paroles: paroles.trim() || null,
    })
    setEnvoiEnCours(false)
    if (!error) {
      setTitre('')
      setAuteur('')
      setLienAudio('')
      setParoles('')
      charger()
    }
  }

  async function supprimer(id: string) {
    setChants(prev => prev.filter(c => c.id !== id))
    await supabase.from('chants').delete().eq('id', id)
  }

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }
  if (statutAcces === 'non_connecte') return <Login onConnecte={verifierAcces} />
  if (statutAcces === 'refuse') {
    return <AccesRestreint message="Ce module est réservé à l'administration du camp." />
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Chants &amp; Louange</h1>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Ajouter un chant</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Titre</label>
              <input
                type="text"
                value={titre}
                onChange={e => setTitre(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                placeholder="Ex : Mon Berger"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Auteur</label>
              <input
                type="text"
                value={auteur}
                onChange={e => setAuteur(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                placeholder="Ex : Groupe Emmanuel"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Lien d'écoute (audio / streaming)</label>
            <input
              type="url"
              value={lienAudio}
              onChange={e => setLienAudio(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Paroles</label>
            <textarea
              value={paroles}
              onChange={e => setParoles(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="Couplet 1..."
            />
          </div>

          <button
            type="button"
            onClick={ajouter}
            disabled={!formulaireValide || envoiEnCours}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
              formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {envoiEnCours ? 'Ajout...' : 'Ajouter le chant'}
          </button>
        </div>

        <div className="space-y-3">
          {chants.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-[#1B3B1A]">{c.titre}</p>
                {c.auteur && <p className="text-xs text-gray-400">{c.auteur}</p>}
              </div>
              <button
                type="button"
                onClick={() => supprimer(c.id)}
                className="text-xs text-gray-400 hover:text-[#B3492F] shrink-0"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

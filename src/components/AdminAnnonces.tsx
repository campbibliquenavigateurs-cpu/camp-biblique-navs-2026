import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Back-office Annonces (Phase 3, Étape 4)
// Réservé au rôle : admin
// ============================================================

const ROLES_ADMIN = ['admin'] as const

type Priorite = 'high' | 'medium' | 'low'

interface Annonce {
  id: string
  titre: string
  contenu: string
  priorite: Priorite
  date_publication: string
}

const LIBELLES_PRIORITE: Record<Priorite, string> = { high: 'Haute', medium: 'Moyenne', low: 'Basse' }

function couleurPriorite(priorite: Priorite) {
  if (priorite === 'high') return 'bg-[#B3492F]/10 text-[#B3492F]'
  if (priorite === 'medium') return 'bg-[#D9A441]/15 text-[#8A6A23]'
  return 'bg-[#E7F2DE] text-[#1B3B1A]'
}

export default function AdminAnnonces() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [priorite, setPriorite] = useState<Priorite>('medium')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from('annonces')
      .select('*')
      .order('date_publication', { ascending: false })
    if (!error && data) setAnnonces(data as Annonce[])
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const formulaireValide = titre.trim() !== '' && contenu.trim() !== ''

  async function publier() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)
    const { error } = await supabase.from('annonces').insert({
      titre: titre.trim(),
      contenu: contenu.trim(),
      priorite,
    })
    setEnvoiEnCours(false)
    if (!error) {
      setTitre('')
      setContenu('')
      setPriorite('medium')
      charger()
    }
  }

  async function supprimer(id: string) {
    setAnnonces(prev => prev.filter(a => a.id !== id))
    await supabase.from('annonces').delete().eq('id', id)
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
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Annonces du camp</h1>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Publier une annonce</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Titre</label>
            <input
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="Ex : Changement d'horaire du culte du matin"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Contenu</label>
            <textarea
              value={contenu}
              onChange={e => setContenu(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="Détail du message..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Niveau de priorité</label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'medium', 'low'] as Priorite[]).map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriorite(p)}
                  className={`rounded-lg border-2 py-2 text-sm font-semibold transition-all duration-200 ${
                    priorite === p
                      ? 'border-[#4F8A3D] bg-[#E7F2DE] text-[#1B3B1A]'
                      : 'border-gray-200 text-gray-500 hover:border-[#9CC18F]'
                  }`}
                >
                  {LIBELLES_PRIORITE[p]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={publier}
            disabled={!formulaireValide || envoiEnCours}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
              formulaireValide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {envoiEnCours ? 'Publication...' : 'Publier'}
          </button>
        </div>

        <div className="space-y-3">
          {annonces.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-[#1B3B1A]">{a.titre}</p>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${couleurPriorite(a.priorite)}`}>
                    {LIBELLES_PRIORITE[a.priorite]}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{a.contenu}</p>
              </div>
              <button
                type="button"
                onClick={() => supprimer(a.id)}
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

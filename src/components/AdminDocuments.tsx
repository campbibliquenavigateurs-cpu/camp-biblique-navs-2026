import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Back-office Documents (Phase 3, Étape 4)
// Réservé au rôle : admin
//
// Note : ce formulaire fonctionne par PARTAGE DE LIEN (Google Drive, etc.),
// pas par upload de fichier vers Supabase Storage. Le schéma de la table
// "documents" (Phase 2) prévoit déjà un champ url_fichier pour cet usage.
// Un véritable upload vers Storage est possible en évolution future si besoin.
// ============================================================

const ROLES_ADMIN = ['admin'] as const

type Nature = 'manuel' | 'atelier' | 'fiche' | 'autre'

interface DocumentItem {
  id: string
  titre: string
  nature: Nature
  dossier: string | null
  url_fichier: string
}

const LIBELLES_NATURE: Record<Nature, string> = {
  manuel: 'Manuel',
  atelier: 'Atelier',
  fiche: 'Fiche',
  autre: 'Autre',
}

export default function AdminDocuments() {
  const { statutAcces, profilId, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [titre, setTitre] = useState('')
  const [nature, setNature] = useState<Nature>('fiche')
  const [dossier, setDossier] = useState('')
  const [urlFichier, setUrlFichier] = useState('')
  const [envoiEnCours, setEnvoiEnCours] = useState(false)

  const charger = useCallback(async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('dossier', { ascending: true })
    if (!error && data) setDocuments(data as DocumentItem[])
  }, [])

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces, charger])

  const formulaireValide = titre.trim() !== '' && urlFichier.trim() !== ''

  async function ajouter() {
    if (!formulaireValide) return
    setEnvoiEnCours(true)
    const { error } = await supabase.from('documents').insert({
      titre: titre.trim(),
      nature,
      dossier: dossier.trim() || null,
      url_fichier: urlFichier.trim(),
      cree_par: profilId,
    })
    setEnvoiEnCours(false)
    if (!error) {
      setTitre('')
      setDossier('')
      setUrlFichier('')
      setNature('fiche')
      charger()
    }
  }

  async function supprimer(id: string) {
    setDocuments(prev => prev.filter(d => d.id !== id))
    await supabase.from('documents').delete().eq('id', id)
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
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Documents &amp; Manuels</h1>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-4">Partager un document</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Titre</label>
            <input
              type="text"
              value={titre}
              onChange={e => setTitre(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="Ex : Atelier 1 — Vivre sa foi au quotidien"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nature</label>
              <select
                value={nature}
                onChange={e => setNature(e.target.value as Nature)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              >
                {(['fiche', 'manuel', 'atelier', 'autre'] as Nature[]).map(n => (
                  <option key={n} value={n}>{LIBELLES_NATURE[n]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Dossier</label>
              <input
                type="text"
                value={dossier}
                onChange={e => setDossier(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                placeholder="Ex : Ateliers Ados"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Lien du fichier</label>
            <input
              type="url"
              value={urlFichier}
              onChange={e => setUrlFichier(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="https://drive.google.com/..."
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
            {envoiEnCours ? 'Ajout...' : 'Partager'}
          </button>
        </div>

        <div className="space-y-3">
          {documents.map(d => (
            <div key={d.id} className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-[#1B3B1A]">{d.titre}</p>
                  <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[#E7F2DE] text-[#1B3B1A]">
                    {LIBELLES_NATURE[d.nature]}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{d.dossier ?? 'Sans dossier'}</p>
              </div>
              <button
                type="button"
                onClick={() => supprimer(d.id)}
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

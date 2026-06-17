import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Affichage public des documents
// Lecture libre (sans connexion) — RLS "documents_select_public" (Phase 2)
// ============================================================

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

const DOSSIER_PAR_DEFAUT = 'Documents généraux'

export default function DocumentsPublic() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [chargement, setChargement] = useState(true)
  const [dossiersOuverts, setDossiersOuverts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('dossier', { ascending: true })
      if (!error && data) setDocuments(data as DocumentItem[])
      setChargement(false)
    }
    charger()
  }, [])

  const dossiers = documents.reduce<Record<string, DocumentItem[]>>((acc, doc) => {
    const cle = doc.dossier?.trim() || DOSSIER_PAR_DEFAUT
    if (!acc[cle]) acc[cle] = []
    acc[cle].push(doc)
    return acc
  }, {})

  function basculerDossier(nom: string) {
    setDossiersOuverts(prev => ({ ...prev, [nom]: !prev[nom] }))
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Téléchargements</h1>

        {chargement ? (
          <p className="text-center text-sm text-gray-400 py-8">Chargement...</p>
        ) : Object.keys(dossiers).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucun document disponible pour le moment.</p>
        ) : (
          Object.entries(dossiers).map(([nomDossier, items]) => (
            <div key={nomDossier} className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => basculerDossier(nomDossier)}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <p className="font-semibold text-[#1B3B1A]">{nomDossier}</p>
                <span className="text-xs text-gray-400">
                  {items.length} document{items.length > 1 ? 's' : ''} {dossiersOuverts[nomDossier] ? '−' : '+'}
                </span>
              </button>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  dossiersOuverts[nomDossier] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <ul className="divide-y divide-gray-50">
                  {items.map(doc => (
                    <li key={doc.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold rounded-full px-2 py-0.5 bg-[#E7F2DE] text-[#1B3B1A]">
                          {LIBELLES_NATURE[doc.nature]}
                        </span>
                        <span className="text-sm text-[#1B3B1A]">{doc.titre}</span>
                      </div>
                      <a
                        href={doc.url_fichier}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-[#4F8A3D] hover:underline shrink-0 ml-3"
                      >
                        Ouvrir
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

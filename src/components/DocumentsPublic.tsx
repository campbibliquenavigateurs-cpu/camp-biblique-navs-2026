import { useEffect, useMemo, useState } from 'react'
import { Folder, FileText, FileSpreadsheet, File, Download, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatTailleOctets } from '../utils/format'
import { SkeletonCarteDossier } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Ressources (Drive Premium, Phase 17)
// Dossiers cliquables (transition CSS fluide), fichiers avec icône
// colorée selon le type, taille réelle, téléchargement invisible
// (récupération en mémoire + clic synthétique, jamais d'onglet vide).
// Icône de dossier en Lucide plutôt qu'en emoji, pour rester cohérent
// avec le reste de l'application (aucun emoji ailleurs dans l'app).
// ============================================================

const STYLES = `
  @keyframes apparitionDouce {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .apparition { animation: apparitionDouce 0.35s ease-out both; }
`

interface Dossier {
  id: string
  nom: string
}

interface DocumentLigne {
  id: string
  titre: string
  description: string | null
  dossier_id: string | null
  url_fichier: string
  taille_octets: number | null
}

function extension(nomOuUrl: string): string {
  const partie = nomOuUrl.split('?')[0].split('.').pop() ?? ''
  return partie.toLowerCase()
}

function IconeFichier({ url }: { url: string }) {
  const ext = extension(url)
  if (ext === 'pdf') return <FileText className="w-6 h-6 text-[#B3492F]" strokeWidth={1.7} />
  if (ext === 'doc' || ext === 'docx') return <FileText className="w-6 h-6 text-[#3B6FA8]" strokeWidth={1.7} />
  if (ext === 'xls' || ext === 'xlsx') return <FileSpreadsheet className="w-6 h-6 text-[#4F8A3D]" strokeWidth={1.7} />
  return <File className="w-6 h-6 text-gray-400" strokeWidth={1.7} />
}

// Téléchargement entièrement invisible : on récupère le fichier en
// mémoire puis on déclenche un clic synthétique sur une URL locale —
// jamais de nouvel onglet ni de page blanche, contrairement à un
// simple lien externe.
async function telecharger(url: string, nomFichier: string) {
  try {
    const reponse = await fetch(url)
    const blob = await reponse.blob()
    const urlLocale = URL.createObjectURL(blob)
    const lien = document.createElement('a')
    lien.href = urlLocale
    lien.download = nomFichier
    document.body.appendChild(lien)
    lien.click()
    document.body.removeChild(lien)
    URL.revokeObjectURL(urlLocale)
  } catch {
    window.open(url, '_blank')
  }
}

export default function DocumentsPublic() {
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [documents, setDocuments] = useState<DocumentLigne[]>([])
  const [chargement, setChargement] = useState(true)
  const [dossierOuvertId, setDossierOuvertId] = useState<string | null | 'autres'>(null)

  useEffect(() => {
    async function charger() {
      const [resDossiers, resDocuments] = await Promise.all([
        supabase.from('dossiers_documents').select('id,nom').order('ordre'),
        supabase.from('documents').select('id,titre,description,dossier_id,url_fichier,taille_octets'),
      ])
      if (resDossiers.data) setDossiers(resDossiers.data as Dossier[])
      if (resDocuments.data) setDocuments(resDocuments.data as DocumentLigne[])
      setChargement(false)
    }
    charger()
  }, [])

  const documentsParDossier = useMemo(() => {
    const carte = new Map<string, DocumentLigne[]>()
    for (const doc of documents) {
      const cle = doc.dossier_id ?? 'autres'
      if (!carte.has(cle)) carte.set(cle, [])
      carte.get(cle)!.push(doc)
    }
    return carte
  }, [documents])

  const sansDossier = documentsParDossier.get('autres') ?? []
  const dossiersAffiches = [
    ...dossiers,
    ...(sansDossier.length > 0 ? [{ id: 'autres', nom: 'Autres documents' }] : []),
  ]

  const documentsAffiches = dossierOuvertId ? documentsParDossier.get(dossierOuvertId) ?? [] : []
  const nomDossierOuvert = dossiersAffiches.find(d => d.id === dossierOuvertId)?.nom ?? ''

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-6 text-center">Ressources &amp; Documents</h1>

        {chargement ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <SkeletonCarteDossier /><SkeletonCarteDossier /><SkeletonCarteDossier />
          </div>
        ) : !dossierOuvertId ? (
          // ---- Vue d'ensemble : grille de dossiers ----
          <div className="apparition grid grid-cols-2 sm:grid-cols-3 gap-3">
            {dossiersAffiches.length === 0 ? (
              <p className="col-span-full text-center text-sm text-gray-400 py-8">Aucun document pour le moment.</p>
            ) : dossiersAffiches.map(d => {
              const nb = (documentsParDossier.get(d.id) ?? []).length
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDossierOuvertId(d.id)}
                  className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md hover:scale-[1.02] transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#E7F2DE] flex items-center justify-center mb-3">
                    <Folder className="w-6 h-6 text-[#4F8A3D]" strokeWidth={1.7} />
                  </div>
                  <p className="text-sm font-semibold text-[#1B3B1A]">{d.nom}</p>
                  <span className="text-xs text-gray-400 mt-1">{nb} fichier{nb > 1 ? 's' : ''}</span>
                </button>
              )
            })}
          </div>
        ) : (
          // ---- Dossier ouvert : liste des fichiers ----
          <div className="apparition">
            <button
              type="button"
              onClick={() => setDossierOuvertId(null)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#5B7A56] hover:text-[#1B3B1A] mb-4"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2} />
              Retour aux dossiers
            </button>
            <p className="text-sm font-bold text-[#1B3B1A] mb-3">{nomDossierOuvert}</p>

            {documentsAffiches.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">Aucun document dans ce dossier.</p>
            ) : (
              <div className="space-y-2.5">
                {documentsAffiches.map(doc => (
                  <div key={doc.id} className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4 flex items-center gap-3">
                    <div className="shrink-0"><IconeFichier url={doc.url_fichier} /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1B3B1A] truncate">{doc.titre}</p>
                      {doc.description && <p className="text-xs text-gray-500 truncate">{doc.description}</p>}
                      <p className="text-xs text-gray-400 mt-0.5">{formatTailleOctets(doc.taille_octets)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => telecharger(doc.url_fichier, doc.titre)}
                      title="Télécharger"
                      className="shrink-0 p-2 rounded-lg text-[#4F8A3D] hover:bg-[#F4F9F0]"
                    >
                      <Download className="w-5 h-5" strokeWidth={1.8} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

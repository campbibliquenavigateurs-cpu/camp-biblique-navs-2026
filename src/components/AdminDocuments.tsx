import { useCallback, useEffect, useMemo, useState } from 'react'
import { Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { formatTailleOctets } from '../utils/format'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer, ToggleVisible } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Administration Documents (Phase 17)
// Dossiers dynamiques + vrai stockage de fichiers (Supabase Storage,
// bucket "documents") + interrupteurs de visibilité publique.
// ============================================================

const PAR_PAGE = 10

interface Dossier {
  id: string
  nom: string
  visible: boolean
}

interface DocumentLigne {
  id: string
  titre: string
  description: string | null
  dossier_id: string | null
  url_fichier: string
  taille_octets: number | null
  visible: boolean
}

// Extrait le chemin de stockage à partir d'une URL publique Supabase,
// pour pouvoir supprimer le fichier réel en plus de la ligne en base.
function cheminDepuisUrl(url: string): string | null {
  const marqueur = '/object/public/documents/'
  const idx = url.indexOf(marqueur)
  return idx === -1 ? null : url.slice(idx + marqueur.length)
}

function ModaleDossier({ donnee, onFermer, onSauvegarde }: {
  donnee: Dossier | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [nom, setNom] = useState(donnee?.nom ?? '')
  const [envoi, setEnvoi] = useState(false)
  const valide = nom.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = donnee
      ? await supabase.from('dossiers_documents').update({ nom: nom.trim() }).eq('id', donnee.id)
      : await supabase.from('dossiers_documents').insert({ nom: nom.trim() })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Dossier renommé !' : 'Dossier créé !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Renommer le dossier' : 'Ajouter un dossier'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom du dossier</label>
          <input type="text" value={nom} onChange={e => setNom(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Ex : Programmes" />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

function ModaleDocument({ donnee, dossiers, onFermer, onSauvegarde }: {
  donnee: DocumentLigne | null
  dossiers: Dossier[]
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [titre, setTitre] = useState(donnee?.titre ?? '')
  const [description, setDescription] = useState(donnee?.description ?? '')
  const [dossierId, setDossierId] = useState(donnee?.dossier_id ?? '')
  const [fichier, setFichier] = useState<File | null>(null)
  const [envoi, setEnvoi] = useState(false)

  // En édition, le fichier reste optionnel (on peut juste corriger le
  // titre/la description sans re-téléverser) ; en ajout, il est requis.
  const valide = titre.trim() !== '' && (donnee ? true : fichier !== null)

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)

    let urlFichier = donnee?.url_fichier ?? ''
    let tailleOctets = donnee?.taille_octets ?? null

    if (fichier) {
      const extension = fichier.name.split('.').pop()?.toLowerCase() || 'bin'
      const chemin = `${crypto.randomUUID()}.${extension}`
      const { error: erreurUpload } = await supabase.storage.from('documents').upload(chemin, fichier)
      if (erreurUpload) {
        setEnvoi(false)
        toast.erreur("Erreur lors de l'envoi du fichier.")
        return
      }
      urlFichier = supabase.storage.from('documents').getPublicUrl(chemin).data.publicUrl
      tailleOctets = fichier.size
    }

    const payload = {
      titre: titre.trim(),
      description: description.trim() || null,
      dossier_id: dossierId || null,
      url_fichier: urlFichier,
      taille_octets: tailleOctets,
    }

    const { error } = donnee
      ? await supabase.from('documents').update(payload).eq('id', donnee.id)
      : await supabase.from('documents').insert(payload)

    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Document mis à jour !' : 'Document ajouté !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le document' : 'Ajouter un document'} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Titre</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Ex : Programme du camp" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder="Brève description du contenu" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Dossier</label>
          <select value={dossierId} onChange={e => setDossierId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
            <option value="">Aucun (Autres documents)</option>
            {dossiers.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">
            Fichier {donnee && <span className="text-gray-400 font-normal">(laisser vide pour ne pas remplacer)</span>}
          </label>
          <input
            type="file"
            onChange={e => setFichier(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#4F8A3D] file:text-white hover:file:bg-[#3F7530] file:cursor-pointer cursor-pointer"
          />
          {fichier && (
            <p className="flex items-center gap-1.5 text-xs text-[#4F8A3D] mt-1.5 font-medium">
              <Paperclip className="w-3.5 h-3.5" strokeWidth={1.8} />
              {fichier.name} ({formatTailleOctets(fichier.size)})
            </p>
          )}
          {donnee && !fichier && (
            <p className="text-xs text-gray-400 mt-1.5">Fichier actuel conservé ({formatTailleOctets(donnee.taille_octets)})</p>
          )}
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Envoi en cours...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

export default function AdminDocuments() {
  const toast = useToast()
  const [dossiers, setDossiers] = useState<Dossier[]>([])
  const [documents, setDocuments] = useState<DocumentLigne[]>([])
  const [chargement, setChargement] = useState(true)
  const [page, setPage] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  const [modaleDossier, setModaleDossier] = useState<Dossier | 'nouveau' | null>(null)
  const [modaleDocument, setModaleDocument] = useState<DocumentLigne | 'nouveau' | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const [resDossiers, resDocuments] = await Promise.all([
      supabase.from('dossiers_documents').select('*').order('ordre'),
      supabase.from('documents').select('id,titre,description,dossier_id,url_fichier,taille_octets,visible').order('titre'),
    ])
    if (resDossiers.data) setDossiers(resDossiers.data as Dossier[])
    if (resDocuments.data) setDocuments(resDocuments.data as DocumentLigne[])
    setChargement(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  const nomDossier = useMemo(() => {
    const carte = new Map(dossiers.map(d => [d.id, d.nom]))
    return (id: string | null) => (id ? carte.get(id) ?? '—' : 'Aucun')
  }, [dossiers])

  async function basculerVisibiliteDossier(d: Dossier) {
    const { error } = await supabase.from('dossiers_documents').update({ visible: !d.visible }).eq('id', d.id)
    if (error) { toast.erreur("Impossible de modifier la visibilité de ce dossier."); console.error(error); return }
    charger()
  }
  async function basculerVisibiliteDocument(doc: DocumentLigne) {
    const { error } = await supabase.from('documents').update({ visible: !doc.visible }).eq('id', doc.id)
    if (error) { toast.erreur("Impossible de modifier la visibilité de ce document."); console.error(error); return }
    charger()
  }

  async function supprimerDossier(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('dossiers_documents').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Dossier supprimé.')
    charger()
  }

  async function supprimerDocument(doc: DocumentLigne) {
    setConfirmationId(null)
    const chemin = cheminDepuisUrl(doc.url_fichier)
    if (chemin) await supabase.storage.from('documents').remove([chemin])
    const { error } = await supabase.from('documents').delete().eq('id', doc.id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Document supprimé.')
    charger()
  }

  return (
    <div className="px-4 py-6 space-y-5 bg-[#F4F9F0]">

      {/* Dossiers */}
      <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
          <p className="text-sm font-bold text-[#1B3B1A]">Dossiers</p>
          <button type="button" onClick={() => setModaleDossier('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
            + Ajouter
          </button>
        </div>
        <div className="divide-y divide-[#E7F2DE]">
          {chargement ? (
            <p className="px-5 py-4 text-sm text-gray-400">Chargement...</p>
          ) : dossiers.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400">Aucun dossier pour le moment.</p>
          ) : dossiers.map(d => (
            <div key={d.id} className="flex items-center gap-3 px-5 py-3">
              <p className="flex-1 text-sm font-medium text-[#1B3B1A]">{d.nom}</p>
              <span className="text-xs text-gray-400">{d.visible ? 'Visible' : 'Masqué'}</span>
              <ToggleVisible visible={d.visible} onBasculer={() => basculerVisibiliteDossier(d)} />
              <BoutonModifier onClick={() => setModaleDossier(d)} />
              <BoutonSupprimer id={d.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimerDossier(d.id)} />
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
          <p className="text-sm font-bold text-[#1B3B1A]">Documents</p>
          <button type="button" onClick={() => setModaleDocument('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
            + Ajouter
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                <th className="px-4 py-2.5 font-medium">Titre</th>
                <th className="px-4 py-2.5 font-medium">Dossier</th>
                <th className="px-4 py-2.5 font-medium">Taille</th>
                <th className="px-4 py-2.5 font-medium">Visible</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F2DE]">
              {chargement ? (
                <SkeletonTableau lignes={5} colonnes={5} />
              ) : documents.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-5 text-center text-gray-400">Aucun document.</td></tr>
              ) : paginer(documents, page, PAR_PAGE).map(doc => (
                <tr key={doc.id} className="text-[#1B3B1A]">
                  <td className="px-4 py-2.5 font-medium">{doc.titre}</td>
                  <td className="px-4 py-2.5 text-gray-500">{nomDossier(doc.dossier_id)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{formatTailleOctets(doc.taille_octets)}</td>
                  <td className="px-4 py-2.5"><ToggleVisible visible={doc.visible} onBasculer={() => basculerVisibiliteDocument(doc)} /></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <BoutonModifier onClick={() => setModaleDocument(doc)} />
                      <BoutonSupprimer id={doc.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimerDocument(doc)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(documents.length / PAR_PAGE))} onChange={setPage} />
      </div>

      {modaleDossier && (
        <ModaleDossier
          donnee={modaleDossier === 'nouveau' ? null : modaleDossier}
          onFermer={() => setModaleDossier(null)}
          onSauvegarde={charger}
        />
      )}
      {modaleDocument && (
        <ModaleDocument
          donnee={modaleDocument === 'nouveau' ? null : modaleDocument}
          dossiers={dossiers}
          onFermer={() => setModaleDocument(null)}
          onSauvegarde={charger}
        />
      )}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Music, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { formatTailleOctets } from '../utils/format'
import { Modale, BoutonSupprimer, BoutonModifier, Pagination, paginer } from './ComposantsTableau'
import { SkeletonTableau } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Administration Louange (Phase 22)
// CRUD complet, téléversement de fichiers audio vers Supabase
// Storage (même principe que les Documents, Phase 17).
// ============================================================

const PAR_PAGE = 10

interface Chant {
  id: string
  numero: number | null
  titre: string
  thematique: string | null
  paroles: string | null
  url_audio: string | null
  taille_audio_octets: number | null
}

function cheminDepuisUrl(url: string): string | null {
  const marqueur = '/object/public/chants_audio/'
  const idx = url.indexOf(marqueur)
  return idx === -1 ? null : url.slice(idx + marqueur.length)
}

function ModaleChant({ donnee, onFermer, onSauvegarde }: {
  donnee: Chant | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [numero, setNumero] = useState(donnee ? String(donnee.numero ?? '') : '')
  const [titre, setTitre] = useState(donnee?.titre ?? '')
  const [thematique, setThematique] = useState(donnee?.thematique ?? '')
  const [paroles, setParoles] = useState(donnee?.paroles ?? '')
  const [fichier, setFichier] = useState<File | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const valide = titre.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)

    let urlAudio = donnee?.url_audio ?? null
    let tailleAudio = donnee?.taille_audio_octets ?? null

    if (fichier) {
      const extension = fichier.name.split('.').pop()?.toLowerCase() || 'mp3'
      const chemin = `${crypto.randomUUID()}.${extension}`
      const { error: erreurUpload } = await supabase.storage.from('chants_audio').upload(chemin, fichier)
      if (erreurUpload) {
        setEnvoi(false)
        toast.erreur("Erreur lors de l'envoi du fichier audio.")
        return
      }
      urlAudio = supabase.storage.from('chants_audio').getPublicUrl(chemin).data.publicUrl
      tailleAudio = fichier.size
    }

    const payload = {
      numero: numero === '' ? null : Number(numero),
      titre: titre.trim(),
      thematique: thematique.trim() || null,
      paroles: paroles.trim() || null,
      url_audio: urlAudio,
      taille_audio_octets: tailleAudio,
    }

    const { error } = donnee
      ? await supabase.from('chants').update(payload).eq('id', donnee.id)
      : await supabase.from('chants').insert(payload)

    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Chant mis à jour !' : 'Chant ajouté !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? 'Modifier le chant' : 'Ajouter un chant'} onFermer={onFermer}>
      <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Numéro</label>
            <input type="number" min={0} value={numero} onChange={e => setNumero(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : 12" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Thématique</label>
            <input type="text" value={thematique} onChange={e => setThematique(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Louange" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Titre</label>
          <input type="text" value={titre} onChange={e => setTitre(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Quel ami fidèle et tendre" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Paroles</label>
          <textarea value={paroles} onChange={e => setParoles(e.target.value)} rows={6}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Paroles complètes du chant" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">
            Fichier audio (.mp3, .m4a, .wav...) {donnee && <span className="text-gray-400 font-normal">(laisser vide pour ne pas remplacer)</span>}
          </label>
          <input
            type="file"
            accept="audio/*"
            onChange={e => setFichier(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#4F8A3D] file:text-white hover:file:bg-[#3F7530] file:cursor-pointer cursor-pointer"
          />
          {fichier && (
            <p className="flex items-center gap-1.5 text-xs text-[#4F8A3D] mt-1.5 font-medium">
              <Paperclip className="w-3.5 h-3.5" strokeWidth={1.8} />
              {fichier.name} ({formatTailleOctets(fichier.size)})
            </p>
          )}
          {donnee?.url_audio && !fichier && (
            <p className="text-xs text-gray-400 mt-1.5">Fichier actuel conservé ({formatTailleOctets(donnee.taille_audio_octets)})</p>
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

export default function AdminChants() {
  const toast = useToast()
  const [chants, setChants] = useState<Chant[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [page, setPage] = useState(1)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)
  const [modaleChant, setModaleChant] = useState<Chant | 'nouveau' | null>(null)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase.from('chants').select('*').order('numero')
    if (!error && data) setChants(data as Chant[])
    setChargement(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  const chantsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    if (!q) return chants
    return chants.filter(c => c.titre.toLowerCase().includes(q) || String(c.numero ?? '').includes(q))
  }, [chants, recherche])

  async function supprimer(chant: Chant) {
    setConfirmationId(null)
    if (chant.url_audio) {
      const chemin = cheminDepuisUrl(chant.url_audio)
      if (chemin) await supabase.storage.from('chants_audio').remove([chemin])
    }
    const { error } = await supabase.from('chants').delete().eq('id', chant.id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Chant supprimé.')
    charger()
  }

  return (
    <div className="px-4 py-6 space-y-4 bg-[#F4F9F0]">
      <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-[#E7F2DE]">
          <input
            type="text"
            value={recherche}
            onChange={e => { setRecherche(e.target.value); setPage(1) }}
            placeholder="Rechercher un chant..."
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
          />
          <button type="button" onClick={() => setModaleChant('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
            + Ajouter un chant
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-[#F4F9F0] text-left text-xs text-gray-500">
                <th className="px-4 py-2.5 font-medium">N°</th>
                <th className="px-4 py-2.5 font-medium">Titre</th>
                <th className="px-4 py-2.5 font-medium">Thématique</th>
                <th className="px-4 py-2.5 font-medium">Audio</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7F2DE]">
              {chargement ? (
                <SkeletonTableau lignes={6} colonnes={5} />
              ) : chantsFiltres.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-5 text-center text-gray-400">Aucun chant trouvé.</td></tr>
              ) : paginer(chantsFiltres, page, PAR_PAGE).map(c => (
                <tr key={c.id} className="text-[#1B3B1A]">
                  <td className="px-4 py-2.5 text-gray-500">{c.numero ?? '—'}</td>
                  <td className="px-4 py-2.5 font-medium">{c.titre}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.thematique ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    {c.url_audio ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-[#E7F2DE] text-[#4F8A3D]">
                        <Music className="w-3 h-3" strokeWidth={2} /> Lié
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <BoutonModifier onClick={() => setModaleChant(c)} />
                      <BoutonSupprimer id={c.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(c)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={Math.max(1, Math.ceil(chantsFiltres.length / PAR_PAGE))} onChange={setPage} />
      </div>

      {modaleChant && (
        <ModaleChant
          donnee={modaleChant === 'nouveau' ? null : modaleChant}
          onFermer={() => setModaleChant(null)}
          onSauvegarde={charger}
        />
      )}
    </div>
  )
}

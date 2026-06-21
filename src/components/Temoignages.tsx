import { useEffect, useMemo, useState } from 'react'
import { Heart, X, Pin, Share2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { formatDateFr } from '../utils/format'
import { SkeletonTemoignage } from './Skeleton'

// ============================================================
// Camp Biblique-Navs 2026 — Témoignages & Impact (Phase 21)
// Mur public (cartes), formulaire de soumission rétractable,
// réactions anti-spam (verrouillage local par appareil).
// ============================================================

const STYLES = `
  @keyframes apparitionDouce { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .apparition { animation: apparitionDouce 0.4s ease-out both; }
  @keyframes coeurPop { 0% { transform: scale(1); } 40% { transform: scale(1.35); } 100% { transform: scale(1); } }
  .coeur-anime { animation: coeurPop 0.35s ease-out; }
`

const CLE_REACTIONS = 'camp-navs-2026-reactions-temoignages'

interface Commission { id: string; nom: string }
interface Temoignage {
  id: string
  contenu: string
  anonyme: boolean
  prenom_auteur: string | null
  commission_id: string | null
  nb_reactions: number
  epingle: boolean
  created_at: string
}

function chargerReactionsLocales(): string[] {
  try {
    const brut = localStorage.getItem(CLE_REACTIONS)
    return brut ? JSON.parse(brut) : []
  } catch {
    return []
  }
}

function CarteTemoignage({ temoignage, nomCommission, dejaReagi, onReagir, vedette = false }: {
  temoignage: Temoignage
  nomCommission: (id: string | null) => string | null
  dejaReagi: boolean
  onReagir: (id: string) => void
  vedette?: boolean
}) {
  const toast = useToast()
  const [anime, setAnime] = useState(false)

  function gererClic() {
    if (dejaReagi) return
    setAnime(true)
    onReagir(temoignage.id)
    setTimeout(() => setAnime(false), 350)
  }

  const commission = nomCommission(temoignage.commission_id)
  const nomAffiche = temoignage.anonyme ? 'Anonyme' : (temoignage.prenom_auteur || 'Anonyme')

  async function partager() {
    const texte = `« ${temoignage.contenu} »\n— ${nomAffiche}, Camp Biblique-Navs 2026`
    const url = `${window.location.origin}/temoignages`
    const partageNatif = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share
    if (partageNatif) {
      try { await partageNatif.call(navigator, { text: texte, url }) } catch { /* annulé par la personne, rien à faire */ }
      return
    }
    try {
      await navigator.clipboard.writeText(`${texte}\n${url}`)
      toast.succes('Témoignage copié, prêt à partager !')
    } catch {
      toast.erreur('Impossible de copier le témoignage.')
    }
  }

  return (
    <div className={`apparition bg-white rounded-2xl shadow-sm p-5 flex flex-col ${vedette ? 'ring-2 ring-[#D9A441] relative' : ''}`}>
      {vedette && (
        <span className="absolute -top-2.5 left-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-[#D9A441] text-white px-2 py-0.5 rounded-full">
          <Pin className="w-2.5 h-2.5" strokeWidth={2} /> À la une
        </span>
      )}
      <p className="text-sm text-[#1B3B1A] leading-relaxed flex-1 mb-3">{temoignage.contenu}</p>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>
          {nomAffiche}
          {!temoignage.anonyme && commission && ` · ${commission}`}
          {' · '}{formatDateFr(temoignage.created_at)}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={partager} title="Partager"
            className="p-1.5 rounded-full text-gray-400 hover:text-[#4F8A3D] transition-colors duration-150">
            <Share2 className="w-3.5 h-3.5" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={gererClic}
            disabled={dejaReagi}
            title={dejaReagi ? 'Vous avez déjà encouragé ce témoignage' : 'Encourager'}
            className={`flex items-center gap-1 px-2 py-1 rounded-full transition-colors duration-150 ${dejaReagi ? 'text-[#B3492F]' : 'text-gray-400 hover:text-[#B3492F]'}`}
          >
            <Heart className={`w-4 h-4 ${anime ? 'coeur-anime' : ''}`} fill={dejaReagi ? 'currentColor' : 'none'} strokeWidth={1.8} />
            <span className="font-semibold">{temoignage.nb_reactions}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function FormulaireSoumission({ commissions, onFermer, onEnvoye }: {
  commissions: Commission[]
  onFermer: () => void
  onEnvoye: () => void
}) {
  const toast = useToast()
  const [contenu, setContenu] = useState('')
  const [anonyme, setAnonyme] = useState(false)
  const [prenom, setPrenom] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const valide = contenu.trim().length >= 10

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = await supabase.from('temoignages').insert({
      contenu: contenu.trim(),
      anonyme,
      prenom_auteur: anonyme ? null : (prenom.trim() || null),
      commission_id: anonyme ? null : (commissionId || null),
    })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'envoi."); return }
    toast.succes('Merci ! Votre témoignage sera publié après validation par le comité.')
    onEnvoye()
  }

  return (
    <div className="fixed inset-0 h-dvh w-full z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto" onClick={onFermer}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 my-auto max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold text-[#1B3B1A]">Partager un témoignage</p>
          <button type="button" onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Votre témoignage</label>
            <textarea value={contenu} onChange={e => setContenu(e.target.value)} rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]"
              placeholder="Partagez ce que ce camp a représenté pour vous..." />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={anonyme} onChange={e => setAnonyme(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#4F8A3D] focus:ring-[#4F8A3D]" />
            <span className="text-sm text-gray-600">Soumettre anonymement</span>
          </label>

          {!anonyme && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Votre prénom (optionnel)</label>
                <input type="text" value={prenom} onChange={e => setPrenom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]" placeholder="Ex : Marie" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Commission (optionnel)</label>
                <select value={commissionId} onChange={e => setCommissionId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D]">
                  <option value="">Aucune</option>
                  {commissions.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>
          )}

          <button type="button" onClick={soumettre} disabled={!valide || envoi}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
            {envoi ? 'Envoi...' : 'Envoyer pour validation'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Temoignages() {
  const [temoignages, setTemoignages] = useState<Temoignage[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [chargement, setChargement] = useState(true)
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [reactionsLocales, setReactionsLocales] = useState<string[]>([])

  useEffect(() => {
    setReactionsLocales(chargerReactionsLocales())
    charger()
  }, [])

  async function charger() {
    const [resTemoignages, resCommissions] = await Promise.all([
      supabase.from('temoignages').select('*').order('created_at', { ascending: false }),
      supabase.from('commissions').select('id,nom'),
    ])
    if (resTemoignages.data) setTemoignages(resTemoignages.data as Temoignage[])
    if (resCommissions.data) setCommissions(resCommissions.data as Commission[])
    setChargement(false)
  }

  const nomCommission = useMemo(() => {
    const carte = new Map(commissions.map(c => [c.id, c.nom]))
    return (id: string | null) => (id ? carte.get(id) ?? null : null)
  }, [commissions])

  async function reagir(id: string) {
    setTemoignages(prev => prev.map(t => t.id === id ? { ...t, nb_reactions: t.nb_reactions + 1 } : t))
    const suivant = [...reactionsLocales, id]
    setReactionsLocales(suivant)
    try { localStorage.setItem(CLE_REACTIONS, JSON.stringify(suivant)) } catch { /* sans incidence */ }
    await supabase.rpc('incrementer_reaction_temoignage', { p_id: id })
  }

  const epingles = temoignages.filter(t => t.epingle)
  const reste = temoignages.filter(t => !t.epingle)

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-1 text-center">Témoignages &amp; Impact</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Ce que le camp représente, dans les mots de ceux qui l'ont vécu.</p>

        <div className="text-center mb-6">
          <button type="button" onClick={() => setFormulaireOuvert(true)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] transition-colors duration-200">
            Partager un témoignage
          </button>
        </div>

        {chargement ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <SkeletonTemoignage /><SkeletonTemoignage /><SkeletonTemoignage /><SkeletonTemoignage />
          </div>
        ) : temoignages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Aucun témoignage publié pour le moment.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {epingles.map(t => (
              <CarteTemoignage key={t.id} temoignage={t} nomCommission={nomCommission}
                dejaReagi={reactionsLocales.includes(t.id)} onReagir={reagir} vedette />
            ))}
            {reste.map(t => (
              <CarteTemoignage key={t.id} temoignage={t} nomCommission={nomCommission}
                dejaReagi={reactionsLocales.includes(t.id)} onReagir={reagir} />
            ))}
          </div>
        )}
      </div>

      {formulaireOuvert && (
        <FormulaireSoumission
          commissions={commissions}
          onFermer={() => setFormulaireOuvert(false)}
          onEnvoye={() => setFormulaireOuvert(false)}
        />
      )}
    </div>
  )
}

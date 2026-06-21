import { useEffect, useState } from 'react'
import { Star, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

// ============================================================
// Camp Biblique-Navs 2026 — Évaluation du camp (Phase 18)
// Système de vote identifié par téléphone (même mécanisme sécurisé
// que "Mon inscription") pour empêcher les doublons, tout en gardant
// les notes et commentaires détachés de toute identité côté admin.
// Une fois voté, chaque carte se verrouille visuellement.
// ============================================================

const STYLES = `
  @keyframes apparitionDouce {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .apparition-amelioration { animation: apparitionDouce 0.3s ease-out both; }
`

interface Profil { id: string; nom: string; prenoms: string }
interface Rubrique { id: string; nom: string }

function normaliserTelephone(val: string): string {
  let c = val.replace(/\D/g, '')
  if (c.startsWith('225') && c.length > 10) c = c.slice(-10)
  return c
}

function CarteRubrique({ rubrique, verrouillee, inscriptionId, telephone, onVote }: {
  rubrique: Rubrique
  verrouillee: boolean
  inscriptionId: string
  telephone: string
  onVote: (rubriqueId: string) => void
}) {
  const toast = useToast()
  const [note, setNote] = useState(0)
  const [survol, setSurvol] = useState(0)
  const [commentaire, setCommentaire] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [valideLocalement, setValideLocalement] = useState(false)

  async function soumettre() {
    if (note === 0) { toast.erreur('Merci de choisir une note.'); return }
    setEnvoi(true)
    const { data, error } = await supabase.rpc('soumettre_vote_evaluation', {
      p_inscription_id: inscriptionId,
      p_telephone: telephone,
      p_rubrique_id: rubrique.id,
      p_note: note,
      p_commentaire: commentaire.trim() || null,
    })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'envoi de votre vote."); return }
    if (data === 'deja_vote') { toast.erreur('Vous avez déjà voté pour cette rubrique.'); onVote(rubrique.id); return }
    setValideLocalement(true)
    onVote(rubrique.id)
  }

  const cardeVerrouillee = verrouillee || valideLocalement

  if (cardeVerrouillee) {
    return (
      <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 flex items-center gap-3">
        <CheckCircle2 className="w-6 h-6 text-[#4F8A3D] shrink-0" strokeWidth={1.7} />
        <div>
          <p className="text-sm font-semibold text-[#1B3B1A]">{rubrique.nom}</p>
          <p className="text-xs text-gray-400">Merci pour votre vote !</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
      <p className="text-sm font-semibold text-[#1B3B1A] mb-3">{rubrique.nom}</p>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setNote(n)}
            onMouseEnter={() => setSurvol(n)}
            onMouseLeave={() => setSurvol(0)}
            className="transition-transform duration-150 active:scale-90"
          >
            <Star
              className={`w-8 h-8 transition-colors duration-200 ${
                n <= (survol || note) ? 'fill-[#D9A441] text-[#D9A441]' : 'fill-none text-gray-300'
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>

      {note > 0 && note <= 2 && (
        <div className="mt-3 apparition-amelioration">
          <textarea
            value={commentaire}
            onChange={e => setCommentaire(e.target.value)}
            rows={2}
            placeholder="Qu'est-ce qui pourrait être amélioré ? (facultatif)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
          />
        </div>
      )}

      <button
        type="button"
        onClick={soumettre}
        disabled={note === 0 || envoi}
        className={`mt-3 w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
          note > 0 && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        {envoi ? 'Envoi...' : 'Valider mon vote'}
      </button>
    </div>
  )
}

export default function EvaluationForm() {
  const [ouvertures, setOuvertures] = useState<boolean | null>(null)
  const [telephoneSaisie, setTelephoneSaisie] = useState('')
  const [profils, setProfils] = useState<Profil[] | null>(null)
  const [profilChoisi, setProfilChoisi] = useState<Profil | null>(null)
  const [rubriques, setRubriques] = useState<Rubrique[]>([])
  const [rubriquesVotees, setRubriquesVotees] = useState<Set<string>>(new Set())
  const [recherche, setRecherche] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    supabase.rpc('evaluations_sont_ouvertes').then(({ data }: { data: boolean | null }) => setOuvertures(data ?? true))
  }, [])

  async function rechercherProfil() {
    const tel = normaliserTelephone(telephoneSaisie)
    if (tel.length !== 10) { setErreur('Numéro de téléphone invalide (10 chiffres attendus).'); return }
    setErreur('')
    setRecherche(true)
    const { data, error } = await supabase.rpc('lister_profils_par_telephone', { p_telephone: tel })
    setRecherche(false)
    if (error || !data || data.length === 0) {
      setErreur("Aucune inscription trouvée avec ce numéro. Vérifiez le numéro utilisé lors de l'inscription.")
      return
    }
    setProfils(data as Profil[])
    if (data.length === 1) selectionnerProfil(data[0] as Profil)
  }

  async function selectionnerProfil(profil: Profil) {
    setProfilChoisi(profil)
    const tel = normaliserTelephone(telephoneSaisie)
    const [resRubriques, resVotes] = await Promise.all([
      supabase.from('rubriques_evaluation').select('id,nom').order('ordre'),
      supabase.rpc('lister_mes_votes_evaluation', { p_inscription_id: profil.id, p_telephone: tel }),
    ])
    if (resRubriques.data) setRubriques(resRubriques.data as Rubrique[])
    if (resVotes.data) setRubriquesVotees(new Set((resVotes.data as { rubrique_id: string }[]).map(v => v.rubrique_id)))
  }

  function marquerVotee(rubriqueId: string) {
    setRubriquesVotees(prev => new Set(prev).add(rubriqueId))
  }

  if (ouvertures === null) {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Chargement...</p>
      </div>
    )
  }

  if (!ouvertures) {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-[#E7F2DE] p-8 text-center">
          <p className="text-lg font-bold text-[#1B3B1A] mb-2">Évaluations non ouvertes</p>
          <p className="text-sm text-gray-500">Le formulaire d'évaluation du camp n'est pas encore disponible. Revenez un peu plus tard !</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-1 text-center">Évaluation du camp</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Votre avis nous aide à nous améliorer pour les prochains camps.</p>

        {!profilChoisi ? (
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-6">
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Votre numéro de téléphone</label>
            <p className="text-xs text-gray-400 mb-3">Celui utilisé lors de votre inscription au camp.</p>
            <input
              type="tel"
              value={telephoneSaisie}
              onChange={e => setTelephoneSaisie(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 mb-3 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="Ex : 07 00 00 00 00"
            />
            {erreur && <p className="text-xs text-[#B3492F] mb-3">{erreur}</p>}

            {profils && profils.length > 1 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs text-gray-500">Plusieurs profils trouvés avec ce numéro — sélectionnez le vôtre :</p>
                {profils.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectionnerProfil(p)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-[#4F8A3D] hover:bg-[#F4F9F0] text-sm text-[#1B3B1A]"
                  >
                    {p.prenoms} {p.nom}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={rechercherProfil}
              disabled={recherche}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] disabled:bg-gray-300"
            >
              {recherche ? 'Recherche...' : 'Continuer'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Bonjour <span className="font-semibold text-[#1B3B1A]">{profilChoisi.prenoms}</span>, merci de noter chaque rubrique ci-dessous.
            </p>
            {rubriques.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucune rubrique à évaluer pour le moment.</p>
            ) : rubriques.map(r => (
              <CarteRubrique
                key={r.id}
                rubrique={r}
                verrouillee={rubriquesVotees.has(r.id)}
                inscriptionId={profilChoisi.id}
                telephone={normaliserTelephone(telephoneSaisie)}
                onVote={marquerVotee}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

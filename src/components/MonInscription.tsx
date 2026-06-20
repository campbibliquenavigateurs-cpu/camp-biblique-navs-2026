import { useState } from 'react'
import { supabase } from '../lib/supabase'
import ContactsOfficiels from './ContactsOfficiels'
import { formatFCFA } from '../utils/format'

// ============================================================
// Camp Biblique-Navs 2026 — Espace campeur (Phase 6)
// Recherche par téléphone uniquement. Si plusieurs profils
// partagent ce numéro (inscriptions familiales), un écran de
// sélection s'affiche avant la fiche financière.
// ============================================================

function normaliserTelephone(val: string): string {
  let c = val.replace(/\D/g, '')
  if (c.startsWith('225') && c.length > 10) c = c.slice(-10)
  return c
}


interface Profil { id: string; nom: string; prenoms: string }
interface Versement { montant: number; date_versement: string }
interface Inscription {
  categorie: string
  taille_polo: string | null
  statut_paiement: string | null
  montant_paye: number
  montant_du: number
  reduction_accordee: number
  date_inscription: string
}

function statutBadge(solde: number, montantPaye: number) {
  if (solde <= 0) return { label: 'Soldé', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
  if (montantPaye > 0) return { label: 'Paiement partiel', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'En attente', bg: 'bg-gray-100', text: 'text-gray-500' }
}

const champBase = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent'

type Etape = 'recherche' | 'selection' | 'resultat' | 'aucun'

export default function MonInscription() {
  const [telephone, setTelephone] = useState('')
  const [recherche, setRecherche] = useState(false)
  const [erreur, setErreur] = useState('')
  const [etape, setEtape] = useState<Etape>('recherche')
  const [profils, setProfils] = useState<Profil[]>([])
  const [profilChoisi, setProfilChoisi] = useState<Profil | null>(null)
  const [resultat, setResultat] = useState<Inscription | null>(null)
  const [versements, setVersements] = useState<Versement[]>([])
  const telephoneNormalise = normaliserTelephone(telephone)

  async function rechercher() {
    if (telephoneNormalise.length !== 10) {
      setErreur('Merci de renseigner un numéro de téléphone valide (10 chiffres).')
      return
    }
    setRecherche(true)
    setErreur('')

    const { data, error } = await supabase.rpc('lister_profils_par_telephone', {
      p_telephone: telephoneNormalise,
    })

    setRecherche(false)

    if (error) {
      setErreur('Une erreur est survenue. Merci de réessayer.')
      return
    }

    const liste = (data as Profil[]) || []

    if (liste.length === 0) {
      setEtape('aucun')
    } else if (liste.length === 1) {
      await selectionnerProfil(liste[0])
    } else {
      setProfils(liste)
      setEtape('selection')
    }
  }

  async function selectionnerProfil(profil: Profil) {
    setProfilChoisi(profil)
    setRecherche(true)

    const [{ data: fiche, error: erreurFiche }, { data: histo }] = await Promise.all([
      supabase.rpc('consulter_inscription_par_id', { p_id: profil.id, p_telephone: telephoneNormalise }),
      supabase.rpc('lister_versements_inscription', { p_id: profil.id, p_telephone: telephoneNormalise }),
    ])

    setRecherche(false)

    if (erreurFiche || !fiche || fiche.length === 0) {
      setErreur('Une erreur est survenue lors de la consultation. Merci de réessayer.')
      return
    }
    setResultat(fiche[0] as Inscription)
    setVersements((histo as Versement[]) || [])
    setEtape('resultat')
  }

  function reinitialiser() {
    setEtape('recherche')
    setProfils([])
    setProfilChoisi(null)
    setResultat(null)
    setVersements([])
    setErreur('')
  }

  const solde = resultat
    ? Math.max(0, (resultat.montant_du ?? 0) - (resultat.reduction_accordee ?? 0) - (resultat.montant_paye ?? 0))
    : 0
  const badge = resultat ? statutBadge(solde, resultat.montant_paye ?? 0) : null

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#1B3B1A] mb-1 text-center">Mon inscription</h1>
          <p className="text-sm text-gray-500 text-center">
            Renseignez le numéro de téléphone utilisé lors de votre inscription
          </p>
        </div>

        {/* ---- Étape recherche ---- */}
        {etape === 'recherche' && (
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Numéro de téléphone</label>
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                className={champBase}
                placeholder="Ex : 07 00 00 00 00"
                onKeyDown={e => e.key === 'Enter' && rechercher()}
              />
            </div>
            {erreur && <p className="text-xs text-[#B3492F] bg-[#B3492F]/10 rounded-lg px-3 py-2">{erreur}</p>}
            <button
              type="button"
              onClick={rechercher}
              disabled={recherche}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
                recherche ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#4F8A3D] hover:bg-[#3F7530]'
              }`}
            >
              {recherche ? 'Recherche...' : 'Consulter mon inscription'}
            </button>
          </div>
        )}

        {/* ---- Étape sélection (plusieurs profils) ---- */}
        {etape === 'selection' && (
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
            <p className="text-sm font-semibold text-[#1B3B1A] mb-1">Plusieurs inscriptions trouvées</p>
            <p className="text-xs text-gray-500 mb-4">Sélectionnez votre nom dans la liste ci-dessous</p>
            <div className="space-y-2">
              {profils.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectionnerProfil(p)}
                  disabled={recherche}
                  className="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-[#4F8A3D] hover:bg-[#F4F9F0] transition-colors duration-150 text-sm font-medium text-[#1B3B1A]"
                >
                  {p.prenoms} {p.nom}
                </button>
              ))}
            </div>
            <button type="button" onClick={reinitialiser} className="text-sm text-[#5B7A56] hover:underline mt-4">
              Changer de numéro
            </button>
          </div>
        )}

        {/* ---- Étape aucun résultat ---- */}
        {etape === 'aucun' && (
          <div className="bg-white rounded-2xl border border-[#D9A441] shadow-sm p-6 text-center">
            <p className="text-sm font-semibold text-[#1B3B1A] mb-2">Aucune inscription trouvée</p>
            <p className="text-sm text-gray-500 mb-4">
              Aucune inscription n'est associée à ce numéro de téléphone. Si vous pensez qu'il s'agit d'une erreur,
              contactez l'administration ci-dessous.
            </p>
            <button type="button" onClick={reinitialiser} className="text-sm text-[#5B7A56] hover:underline">
              Réessayer avec un autre numéro
            </button>
          </div>
        )}

        {/* ---- Étape résultat ---- */}
        {etape === 'resultat' && resultat && badge && (
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
            <div className="bg-[#1B3B1A] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">{profilChoisi?.prenoms} {profilChoisi?.nom}</p>
                <p className="text-white/50 text-xs mt-0.5">23 – 29 août 2026 · La Sablière, Bingerville</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
            </div>
            <div className="divide-y divide-[#E7F2DE]">
              {[
                { label: 'Catégorie', valeur: resultat.categorie ?? '—' },
                { label: 'Taille de polo', valeur: resultat.taille_polo ?? '—' },
                { label: 'Montant total dû', valeur: formatFCFA(resultat.montant_du ?? 0) },
                ...(resultat.reduction_accordee > 0
                  ? [{ label: 'Réduction accordée', valeur: '− ' + formatFCFA(resultat.reduction_accordee) }]
                  : []),
                { label: 'Montant payé', valeur: formatFCFA(resultat.montant_paye ?? 0) },
              ].map(({ label, valeur }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-[#1B3B1A]">{valeur}</span>
                </div>
              ))}
              <div className={`flex items-center justify-between px-5 py-4 ${solde > 0 ? 'bg-[#D9A441]/10' : 'bg-[#E7F2DE]'}`}>
                <span className="text-sm font-bold text-[#1B3B1A]">Solde restant</span>
                <span className={`text-base font-bold ${solde > 0 ? 'text-[#8A6A23]' : 'text-[#4F8A3D]'}`}>
                  {solde > 0 ? formatFCFA(solde) : 'Aucun solde dû'}
                </span>
              </div>
            </div>

            {/* Historique des versements */}
            {versements.length > 0 && (
              <div className="px-5 py-4 border-t border-[#E7F2DE]">
                <p className="text-sm font-semibold text-[#1B3B1A] mb-2">Historique de vos versements</p>
                <ul className="space-y-1.5">
                  {versements.map((v, i) => (
                    <li key={i} className="text-sm text-gray-600">
                      • {formatFCFA(v.montant)} — reçu le {new Date(v.date_versement).toLocaleDateString('fr-FR')}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="px-5 py-3">
              <button type="button" onClick={reinitialiser} className="text-xs text-gray-400 hover:text-[#5B7A56]">
                Consulter un autre numéro
              </button>
            </div>
          </div>
        )}

        <ContactsOfficiels />
      </div>
    </div>
  )
}

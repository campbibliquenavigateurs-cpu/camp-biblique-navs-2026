import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { recupererApresEchecChargement } from '../utils/recuperation'
import { useAccesRole } from '../hooks/useAccesRole'
import AccesRestreint from './AccesRestreint'
import Login from './Login'

// ============================================================
// Camp Biblique-Navs 2026 — Paramètres du camp (Phase 4, Étape A)
// Permet de modifier l'objectif budgétaire et les quotas de places
// directement depuis l'application, sans passer par le SQL Editor.
// ============================================================

const ROLES_ADMIN = ['admin'] as const

interface Parametre {
  cle: string
  valeur: number
}

const LIBELLES: Record<string, string> = {
  budget_global: 'Objectif budgétaire global (F CFA)',
  places_16_plus: 'Places disponibles — 16 ans et plus',
  places_15_moins: 'Places disponibles — 15 ans et moins',
}

export default function ParametresAdmin() {
  const { statutAcces, verifierAcces } = useAccesRole(ROLES_ADMIN)
  const toast = useToast()
  const [parametres, setParametres] = useState<Parametre[]>([])
  const [valeurs, setValeurs] = useState<Record<string, string>>({})
  const [messageParCle, setMessageParCle] = useState<Record<string, string>>({})
  const [exportEnCours, setExportEnCours] = useState(false)
  const [envoiCommutateur, setEnvoiCommutateur] = useState(false)

  async function charger() {
    const { data, error } = await supabase.from('parametres_camp').select('*').order('cle')
    if (!error && data) {
      const lignes = data as Parametre[]
      setParametres(lignes)
      const init: Record<string, string> = {}
      lignes.forEach(p => { init[p.cle] = String(p.valeur) })
      setValeurs(init)
    }
  }

  useEffect(() => {
    if (statutAcces === 'autorise') charger()
  }, [statutAcces])

  async function enregistrer(cle: string) {
    const valeur = Number(valeurs[cle])
    if (!Number.isFinite(valeur)) return

    const { error } = await supabase.from('parametres_camp').update({ valeur }).eq('cle', cle)
    setMessageParCle(prev => ({ ...prev, [cle]: error ? 'Erreur lors de l\'enregistrement' : 'Enregistré ✓' }))
    setTimeout(() => setMessageParCle(prev => ({ ...prev, [cle]: '' })), 2500)
  }

  // L'inscription ouverte/fermée se pilote comme un commutateur (1/0),
  // pas un champ numérique classique — verrouille/déverrouille
  // instantanément l'accès public au formulaire d'inscription.
  const inscriptionsOuvertes = (valeurs['inscriptions_ouvertes'] ?? '1') !== '0'

  async function basculerInscriptions() {
    const nouvelleValeur = inscriptionsOuvertes ? 0 : 1
    setEnvoiCommutateur(true)
    const { error } = await supabase.from('parametres_camp').update({ valeur: nouvelleValeur }).eq('cle', 'inscriptions_ouvertes')
    setEnvoiCommutateur(false)
    if (error) {
      setMessageParCle(prev => ({ ...prev, inscriptions_ouvertes: 'Erreur lors de la mise à jour' }))
      return
    }
    setValeurs(prev => ({ ...prev, inscriptions_ouvertes: String(nouvelleValeur) }))
    charger()
  }

  // Sauvegarde manuelle des données les plus critiques (inscriptions,
  // paiements, trésorerie...), puisque le palier gratuit de Supabase ne
  // réalise aucune sauvegarde automatique. À télécharger régulièrement
  // et à conserver ailleurs (Google Drive, e-mail...).
  async function telechargerSauvegarde() {
    setExportEnCours(true)
    try {
      const { utils, writeFileXLSX } = await import('xlsx')

      const [inscriptions, versements, tresorerie, commissions, donsNature] = await Promise.all([
        supabase.from('inscriptions').select('*'),
        supabase.from('versements').select('*'),
        supabase.from('tresorerie').select('*'),
        supabase.from('commissions').select('*'),
        supabase.from('dons_nature').select('*'),
      ])

      const classeur = utils.book_new()
      utils.book_append_sheet(classeur, utils.json_to_sheet(inscriptions.data ?? []), 'Inscriptions')
      utils.book_append_sheet(classeur, utils.json_to_sheet(versements.data ?? []), 'Versements')
      utils.book_append_sheet(classeur, utils.json_to_sheet(tresorerie.data ?? []), 'Tresorerie')
      utils.book_append_sheet(classeur, utils.json_to_sheet(commissions.data ?? []), 'Commissions')
      utils.book_append_sheet(classeur, utils.json_to_sheet(donsNature.data ?? []), 'DonsNature')

      writeFileXLSX(classeur, `sauvegarde_camp_navs_2026_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.succes('Sauvegarde téléchargée — conservez-la dans un endroit sûr (Drive, e-mail...).')
    } catch {
      toast.erreur("Échec de la génération — l'application va se mettre à jour, merci de réessayer ensuite.")
      recupererApresEchecChargement()
    } finally {
      setExportEnCours(false)
    }
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
      <div className="max-w-xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-[#1B3B1A]">Paramètres du camp</h1>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
          <p className="text-sm font-semibold text-[#1B3B1A] mb-1">Sauvegarde des données</p>
          <p className="text-xs text-gray-400 mb-3">
            Notre hébergement gratuit ne fait aucune sauvegarde automatique. Téléchargez régulièrement
            cette sauvegarde des données les plus importantes (inscriptions, paiements, trésorerie) et
            conservez-la ailleurs (Google Drive, e-mail...).
          </p>
          <button
            type="button"
            onClick={telechargerSauvegarde}
            disabled={exportEnCours}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] disabled:bg-gray-300"
          >
            <Download className="w-4 h-4" strokeWidth={1.8} />
            {exportEnCours ? 'Préparation...' : 'Télécharger une sauvegarde complète'}
          </button>
        </div>

        {parametres.length === 0 ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1B3B1A]">Inscriptions publiques</p>
                <p className={`text-xs mt-0.5 ${inscriptionsOuvertes ? 'text-[#4F8A3D]' : 'text-[#B3492F]'}`}>
                  {inscriptionsOuvertes ? 'Ouvertes — le formulaire est accessible' : 'Fermées — le formulaire est verrouillé'}
                </p>
              </div>
              <button
                type="button"
                onClick={basculerInscriptions}
                disabled={envoiCommutateur}
                aria-label="Basculer l'état des inscriptions"
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 shrink-0 ${
                  inscriptionsOuvertes ? 'bg-[#4F8A3D]' : 'bg-gray-300'
                } ${envoiCommutateur ? 'opacity-60' : ''}`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
                    inscriptionsOuvertes ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {parametres.filter(p => p.cle !== 'inscriptions_ouvertes').map(p => (
              <div key={p.cle} className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5">
                <label className="block text-sm font-medium text-[#1B3B1A] mb-2">
                  {LIBELLES[p.cle] ?? p.cle}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={valeurs[p.cle] ?? ''}
                    onChange={e => setValeurs(prev => ({ ...prev, [p.cle]: e.target.value }))}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => enregistrer(p.cle)}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]"
                  >
                    Enregistrer
                  </button>
                </div>
                {messageParCle[p.cle] && (
                  <p className="text-xs text-[#4F8A3D] mt-2">{messageParCle[p.cle]}</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

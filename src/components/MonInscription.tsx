import { useState } from 'react'
import { supabase } from '../lib/supabase'

function normaliserTelephone(val) {
  let c = val.replace(/\D/g, '')
  if (c.startsWith('225') && c.length > 10) c = c.slice(-10)
  return c
}

function formatFCFA(n) { return n.toLocaleString('fr-FR') + ' F CFA' }

function statutBadge(solde, montantPaye) {
  if (solde <= 0) return { label: 'Solde', bg: 'bg-[#E7F2DE]', text: 'text-[#4F8A3D]' }
  if (montantPaye > 0) return { label: 'Paiement partiel', bg: 'bg-[#D9A441]/15', text: 'text-[#8A6A23]' }
  return { label: 'En attente', bg: 'bg-gray-100', text: 'text-gray-500' }
}

const champBase = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent'

export default function MonInscription() {
  const [nom, setNom] = useState('')
  const [prenoms, setPrenoms] = useState('')
  const [telephone, setTelephone] = useState('')
  const [recherche, setRecherche] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')

  async function consulter() {
    const tel = normaliserTelephone(telephone)
    if (!nom.trim() || !prenoms.trim() || tel.length !== 10) {
      setErreur('Merci de renseigner nom, prenoms et un numero de telephone valide (10 chiffres).')
      return
    }
    setRecherche(true)
    setErreur('')
    setResultat(null)
    const { data, error } = await supabase.rpc('consulter_inscription', {
      p_nom: nom.trim(), p_prenoms: prenoms.trim(), p_telephone: tel,
    })
    setRecherche(false)
    if (error || !data || data.length === 0) {
      setErreur('Aucune inscription trouvee. Verifiez que nom, prenoms et telephone correspondent exactement.')
      return
    }
    setResultat(data[0])
  }

  const solde = resultat
    ? Math.max(0, (resultat.montant_du || 0) - (resultat.reduction_accordee || 0) - (resultat.montant_paye || 0))
    : 0
  const badge = resultat ? statutBadge(solde, resultat.montant_paye || 0) : null

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-1 text-center">Mon inscription</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Renseignez exactement les informations saisies lors de votre inscription</p>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 space-y-4 mb-5">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom</label>
            <input type="text" value={nom} onChange={e => setNom(e.target.value)} className={champBase} placeholder="Ex : Kouassi" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Prenoms</label>
            <input type="text" value={prenoms} onChange={e => setPrenoms(e.target.value)} className={champBase} placeholder="Ex : Jean-Marc" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Numero de telephone</label>
            <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} className={champBase} placeholder="Ex : 07 00 00 00 00" />
          </div>
          {erreur && <p className="text-xs text-[#B3492F] bg-[#B3492F]/10 rounded-lg px-3 py-2">{erreur}</p>}
          <button type="button" onClick={consulter} disabled={recherche}
            className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${recherche ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#4F8A3D] hover:bg-[#3F7530]'}`}>
            {recherche ? 'Recherche...' : 'Consulter mon inscription'}
          </button>
        </div>

        {resultat && badge && (
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
            <div className="bg-[#1B3B1A] px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">Camp Biblique-Navs 2026</p>
                <p className="text-white/50 text-xs mt-0.5">23 - 29 aout 2026 - La Sabliere, Bingerville</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${badge.bg} ${badge.text}`}>{badge.label}</span>
            </div>
            <div className="divide-y divide-[#E7F2DE]">
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-500">Categorie</span>
                <span className="text-sm font-semibold text-[#1B3B1A]">{resultat.categorie || '-'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-500">Taille de polo</span>
                <span className="text-sm font-semibold text-[#1B3B1A]">{resultat.taille_polo || '-'}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-500">Montant total du</span>
                <span className="text-sm font-semibold text-[#1B3B1A]">{formatFCFA(resultat.montant_du || 0)}</span>
              </div>
              {(resultat.reduction_accordee > 0) && (
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-sm text-gray-500">Reduction accordee</span>
                  <span className="text-sm font-semibold text-[#1B3B1A]">- {formatFCFA(resultat.reduction_accordee)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3.5">
                <span className="text-sm text-gray-500">Montant paye</span>
                <span className="text-sm font-semibold text-[#1B3B1A]">{formatFCFA(resultat.montant_paye || 0)}</span>
              </div>
              <div className={`flex items-center justify-between px-5 py-4 ${solde > 0 ? 'bg-[#D9A441]/10' : 'bg-[#E7F2DE]'}`}>
                <span className="text-sm font-bold text-[#1B3B1A]">Solde restant</span>
                <span className={`text-base font-bold ${solde > 0 ? 'text-[#8A6A23]' : 'text-[#4F8A3D]'}`}>
                  {solde > 0 ? formatFCFA(solde) : 'Aucun solde du'}
                </span>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 py-3">Pour toute question, contactez l'equipe d'organisation.</p>
          </div>
        )}
      </div>
    </div>
  )
}

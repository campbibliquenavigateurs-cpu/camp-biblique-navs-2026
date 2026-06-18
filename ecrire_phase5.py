import os

# ---- Home.tsx ----
home = """import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlacesDispo } from '../hooks/usePlacesDispo'

const DATE_CIBLE = new Date('2026-08-23T00:00:00Z')

function calculerTemps() {
  const diff = DATE_CIBLE.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    jours: Math.floor(diff / 86400000),
    heures: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    secondes: Math.floor((diff % 60000) / 1000),
  }
}

function BlocCompteur({ valeur, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
        <span className="text-2xl sm:text-3xl font-bold text-[#D9A441] tabular-nums">
          {String(valeur).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[10px] sm:text-xs text-white/50 uppercase tracking-widest mt-1.5">{label}</span>
    </div>
  )
}

function BarrePlaces({ label, restant, quota, taux }) {
  const couleur = taux >= 90 ? 'bg-[#B3492F]' : taux >= 70 ? 'bg-[#D9A441]' : 'bg-[#4F8A3D]'
  const textCouleur = taux >= 90 ? 'text-[#B3492F]' : taux >= 70 ? 'text-[#8A6A23]' : 'text-[#4F8A3D]'
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-[#1B3B1A]">{label}</span>
        <span className={`text-sm font-bold ${textCouleur}`}>
          {restant === 0 ? 'Complet' : `${restant} place${restant > 1 ? 's' : ''} restante${restant > 1 ? 's' : ''}`}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[#E7F2DE] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${couleur}`} style={{ width: `${Math.min(taux, 100)}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">{Math.round(taux)}% des {quota} places occupées</p>
    </div>
  )
}

export default function Home() {
  const [temps, setTemps] = useState(calculerTemps)
  const places = usePlacesDispo()

  useEffect(() => {
    const timer = setInterval(() => setTemps(calculerTemps()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-[#F4F9F0]">
      <section className="bg-[#1B3B1A] px-4 py-12 sm:py-16 text-center">
        <p className="text-[#4F8A3D] text-xs sm:text-sm uppercase tracking-[0.2em] font-semibold mb-3">
          Mission Evangelique des Navigateurs CI
        </p>
        <h1 className="text-white font-bold text-2xl sm:text-3xl lg:text-4xl leading-snug max-w-2xl mx-auto">
          Camp Biblique-Navs 2026
        </h1>
        <p className="text-white/70 text-sm sm:text-base mt-3 max-w-xl mx-auto leading-relaxed">
          Les familles et les reseaux relationnels pour former des disciples
        </p>
        <p className="text-[#D9A441] text-xs sm:text-sm font-medium mt-1.5 italic">Jean 1 : 40-42</p>

        <div className="mt-10">
          {temps ? (
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <BlocCompteur valeur={temps.jours} label="Jours" />
              <span className="text-[#D9A441] text-2xl font-bold pb-5">:</span>
              <BlocCompteur valeur={temps.heures} label="Heures" />
              <span className="text-[#D9A441] text-2xl font-bold pb-5">:</span>
              <BlocCompteur valeur={temps.minutes} label="Minutes" />
              <span className="text-[#D9A441] text-2xl font-bold pb-5">:</span>
              <BlocCompteur valeur={temps.secondes} label="Secondes" />
            </div>
          ) : (
            <p className="text-[#D9A441] text-xl font-bold py-4">Le camp est en cours !</p>
          )}
          <p className="text-white/40 text-xs mt-4">23 - 29 aout 2026 - La Sabliere, Bingerville</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link to="/inscription" className="px-7 py-3 rounded-xl text-sm font-bold text-white bg-[#4F8A3D] hover:bg-[#3F7530] transition-colors duration-200">
            S'inscrire maintenant
          </Link>
          <Link to="/mon-inscription" className="px-7 py-3 rounded-xl text-sm font-bold text-white/80 border border-white/30 hover:bg-white/10 transition-colors duration-200">
            Verifier mon inscription
          </Link>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-4 py-8">
        <h2 className="text-base font-bold text-[#1B3B1A] mb-4 text-center">Places disponibles</h2>
        {!places ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-12 rounded-xl bg-[#E7F2DE] animate-pulse" />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 space-y-5">
            <BarrePlaces label="Jeunes et Adultes (16 ans et plus)" restant={places.restantAdultes} quota={places.quotaAdultes} taux={places.tauxRemplissage.adultes} />
            <BarrePlaces label="Enfants et Ados (0 a 15 ans)" restant={places.restantEnfants} quota={places.quotaEnfants} taux={places.tauxRemplissage.enfants} />
          </div>
        )}
      </section>

      <section className="max-w-xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
          <div className="bg-[#1B3B1A] px-5 py-3">
            <p className="text-white text-sm font-bold">Informations pratiques</p>
          </div>
          <div className="divide-y divide-[#E7F2DE]">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">Dates</span>
              <span className="text-sm font-semibold text-[#1B3B1A]">23 - 29 aout 2026</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">Lieu</span>
              <span className="text-sm font-semibold text-[#1B3B1A]">La Sabliere, Bingerville</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">Tarif Enfant / Ado (0-15 ans)</span>
              <span className="text-sm font-bold text-[#D9A441]">25 000 F CFA</span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-gray-500">Tarif Jeune / Adulte (16 ans+)</span>
              <span className="text-sm font-bold text-[#D9A441]">30 000 F CFA</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
"""

# ---- MonInscription.tsx ----
mon_inscription = """import { useState } from 'react'
import { supabase } from '../lib/supabase'

function normaliserTelephone(val) {
  let c = val.replace(/\\D/g, '')
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
"""

# Ecriture des fichiers
os.makedirs('src/components', exist_ok=True)
os.makedirs('src/hooks', exist_ok=True)

with open('src/components/Home.tsx', 'w', encoding='utf-8') as f:
    f.write(home)
print("Home.tsx ecrit avec succes !")

with open('src/components/MonInscription.tsx', 'w', encoding='utf-8') as f:
    f.write(mon_inscription)
print("MonInscription.tsx ecrit avec succes !")

# usePlacesDispo.ts
places_hook = """import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function usePlacesDispo() {
  const [places, setPlaces] = useState(null)

  useEffect(() => {
    async function charger() {
      const { data, error } = await supabase.rpc('get_places_disponibles')
      if (error || !data || data.length === 0) return
      const d = data[0]
      const restantAdultes = Math.max(0, d.quota_adultes - d.inscrits_adultes)
      const restantEnfants = Math.max(0, d.quota_enfants - d.inscrits_enfants)
      setPlaces({
        quotaAdultes: d.quota_adultes,
        quotaEnfants: d.quota_enfants,
        restantAdultes,
        restantEnfants,
        complet: { adultes: restantAdultes === 0, enfants: restantEnfants === 0 },
        tauxRemplissage: {
          adultes: d.quota_adultes > 0 ? (d.inscrits_adultes / d.quota_adultes) * 100 : 0,
          enfants: d.quota_enfants > 0 ? (d.inscrits_enfants / d.quota_enfants) * 100 : 0,
        },
      })
    }
    charger()
  }, [])

  return places
}
"""

with open('src/hooks/usePlacesDispo.ts', 'w', encoding='utf-8') as f:
    f.write(places_hook)
print("usePlacesDispo.ts ecrit avec succes !")

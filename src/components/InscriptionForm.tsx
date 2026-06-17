import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ============================================================
// Camp Biblique-Navs 2026 — Formulaire d'inscription (4 étapes)
// Palette : verts "Greenery" + accent doré pour les tarifs
// ============================================================

// ---- Types ----
type Genre = 'M' | 'F' | ''
type CategorieChoix = 'enfant' | 'adulte' | ''
type TrancheAge = '16-19' | '20-25' | '26-30' | '31-40' | '41-49' | '50+' | ''
type TaillePolo = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | ''
type ChoixOuiNon = 'oui' | 'non' | ''
type Pays = 'CI' | 'autre' | ''

interface InscriptionFormData {
  nom: string
  prenoms: string
  genre: Genre
  categorieChoix: CategorieChoix
  ageExact: string
  trancheAge: TrancheAge
  telephone: string
  occupation: string
  pays: Pays
  paysPrecision: string
  ville: string
  communeQuartier: string
  taillePolo: TaillePolo
  antecedentsMedicaux: string
  dejaParticipe: boolean
  motivation: string
  invite: ChoixOuiNon
  nomReferent: string
  contactUrgenceNom: string
  contactUrgenceTelephone: string
}

const FORM_INITIAL: InscriptionFormData = {
  nom: '', prenoms: '', genre: '', categorieChoix: '', ageExact: '',
  trancheAge: '', telephone: '', occupation: '', pays: '', paysPrecision: '',
  ville: '', communeQuartier: '', taillePolo: '', antecedentsMedicaux: '',
  dejaParticipe: false, motivation: '', invite: '', nomReferent: '',
  contactUrgenceNom: '', contactUrgenceTelephone: ''
}

// Âge minimum de chaque tranche, utilisé pour reconstituer une date de
// naissance approximative et fiable.
const TRANCHES_AGE_MIN: Record<Exclude<TrancheAge, ''>, number> = {
  '16-19': 16, '20-25': 20, '26-30': 26, '31-40': 31, '41-49': 41, '50+': 50
}

const TAILLES_POLO: TaillePolo[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

const PRIX = { enfant: 25000, adulte: 30000 } as const

function formatFCFA(montant: number) {
  return montant.toLocaleString('fr-FR') + ' F CFA'
}

const champBase =
  'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent'

const carteChoix = (actif: boolean) =>
  `rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
    actif
      ? 'border-[#4F8A3D] bg-[#E7F2DE] text-[#1B3B1A]'
      : 'border-gray-200 text-gray-500 hover:border-[#9CC18F]'
  }`

export default function InscriptionForm() {
  const [etape, setEtape] = useState(1)
  const [form, setForm] = useState<InscriptionFormData>(FORM_INITIAL)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [erreurEnvoi, setErreurEnvoi] = useState('')
  const [succes, setSucces] = useState(false)

  const totalEtapes = 4

  function majChamp<K extends keyof InscriptionFormData>(champ: K, valeur: InscriptionFormData[K]) {
    setForm(prev => ({ ...prev, [champ]: valeur }))
  }

  const montantAPayer =
    form.categorieChoix === 'enfant' ? PRIX.enfant : form.categorieChoix === 'adulte' ? PRIX.adulte : 0

  // ---- Validation ----
  const telephoneValide = (val: string) => /^(\+225)?\s?[0-9]{8,10}$/.test(val.replace(/[\s-]/g, ''))

  const etape1Valide =
    form.nom.trim() !== '' &&
    form.prenoms.trim() !== '' &&
    form.genre !== '' &&
    form.categorieChoix !== '' &&
    (form.categorieChoix === 'enfant'
      ? form.ageExact !== '' && Number(form.ageExact) >= 0 && Number(form.ageExact) <= 15
      : form.trancheAge !== '')

  const etape2Valide =
    telephoneValide(form.telephone) &&
    form.occupation.trim() !== '' &&
    form.pays !== '' &&
    (form.pays === 'autre' ? form.paysPrecision.trim() !== '' : true) &&
    form.ville.trim() !== '' &&
    form.communeQuartier.trim() !== '' &&
    form.taillePolo !== ''

  const etape3Valide = form.antecedentsMedicaux.trim() !== '' && form.motivation.trim() !== ''

  const etape4Valide =
    (form.invite === 'oui' ? form.nomReferent.trim() !== '' : form.invite !== '') &&
    form.contactUrgenceNom.trim() !== '' &&
    telephoneValide(form.contactUrgenceTelephone)

  const etapeValide =
    etape === 1 ? etape1Valide : etape === 2 ? etape2Valide : etape === 3 ? etape3Valide : etape4Valide

  function suivant() {
    if (etapeValide && etape < totalEtapes) setEtape(etape + 1)
  }

  function precedent() {
    if (etape > 1) setEtape(etape - 1)
  }

  // La table "inscriptions" calcule automatiquement la vraie catégorie (16+/15-)
  // à partir de cette date via un trigger PostgreSQL : impossible de "tricher"
  // sur le tarif en sélectionnant une fausse catégorie côté formulaire.
  function calculerDateNaissanceApprox(): string {
    const aujourdHui = new Date()
    const age =
      form.categorieChoix === 'enfant'
        ? Number(form.ageExact)
        : TRANCHES_AGE_MIN[form.trancheAge as Exclude<TrancheAge, ''>] ?? 16
    const dateNaissance = new Date(aujourdHui.getFullYear() - age, aujourdHui.getMonth(), aujourdHui.getDate())
    return dateNaissance.toISOString().slice(0, 10)
  }

  async function soumettre() {
    if (!etape4Valide) return
    setEnvoiEnCours(true)
    setErreurEnvoi('')

    const { error } = await supabase.from('inscriptions').insert({
      nom: form.nom.trim(),
      prenoms: form.prenoms.trim(),
      genre: form.genre,
      date_naissance: calculerDateNaissanceApprox(),
      telephone: form.telephone.trim(),
      occupation: form.occupation.trim(),
      pays: form.pays === 'autre' ? form.paysPrecision.trim() : "Côte d'Ivoire",
      ville: form.ville.trim(),
      commune_quartier: form.communeQuartier.trim(),
      taille_polo: form.taillePolo,
      antecedents_medicaux: form.antecedentsMedicaux.trim(),
      deja_participe: form.dejaParticipe,
      motivation: form.motivation.trim(),
      invite_par_referent: form.invite === 'oui' ? form.nomReferent.trim() : null,
      contact_urgence_nom: form.contactUrgenceNom.trim(),
      contact_urgence_telephone: form.contactUrgenceTelephone.trim(),
      montant_du: montantAPayer,
    })

    setEnvoiEnCours(false)

    if (error) {
      setErreurEnvoi('Une erreur est survenue. Merci de réessayer.')
      console.error(error)
    } else {
      setSucces(true)
    }
  }

  if (succes) {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-[#E7F2DE]">
          <div className="w-16 h-16 rounded-full bg-[#E7F2DE] flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#4F8A3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#1B3B1A] mb-2">Inscription envoyée</h2>
          <p className="text-gray-600">
            Merci {form.prenoms} ! Votre inscription au Camp Biblique-Navs 2026 a bien été enregistrée.
            Le comité vous contactera pour la suite du processus de paiement.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-xl mx-auto">

        {/* Barre de progression */}
        <div className="mb-8">
          <div className="flex items-center">
            {[1, 2, 3, 4].map((num, idx) => (
              <div key={num} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-300 shrink-0 ${
                    num <= etape ? 'bg-[#4F8A3D] text-white' : 'bg-[#E7F2DE] text-[#7AA876]'
                  }`}
                >
                  {num}
                </div>
                {idx < 3 && (
                  <div className="flex-1 h-1 mx-2 rounded-full overflow-hidden bg-[#E7F2DE]">
                    <div
                      className="h-full bg-[#4F8A3D] transition-all duration-500 ease-out"
                      style={{ width: num < etape ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#5B7A56] mt-3 font-medium">
            Étape {etape} sur {totalEtapes}
          </p>
        </div>

        {/* Carte du formulaire */}
        <div className="bg-white rounded-2xl shadow-md border border-[#E7F2DE] p-6 sm:p-8">

          {etape === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[#1B3B1A]">Identité &amp; catégorie</h2>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={e => majChamp('nom', e.target.value)}
                  className={champBase}
                  placeholder="Ex : Kouassi"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Prénoms</label>
                <input
                  type="text"
                  value={form.prenoms}
                  onChange={e => majChamp('prenoms', e.target.value)}
                  className={champBase}
                  placeholder="Ex : Jean-Marc"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Genre</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['M', 'F'] as Genre[]).map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => majChamp('genre', g)}
                      className={carteChoix(form.genre === g)}
                    >
                      {g === 'M' ? 'Masculin' : 'Féminin'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Catégorie</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => majChamp('categorieChoix', 'enfant')}
                    className={`rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                      form.categorieChoix === 'enfant'
                        ? 'border-[#4F8A3D] bg-[#E7F2DE]'
                        : 'border-gray-200 hover:border-[#9CC18F]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#1B3B1A]">Enfant / Ado</p>
                    <p className="text-xs text-gray-500">0 à 15 ans</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => majChamp('categorieChoix', 'adulte')}
                    className={`rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
                      form.categorieChoix === 'adulte'
                        ? 'border-[#4F8A3D] bg-[#E7F2DE]'
                        : 'border-gray-200 hover:border-[#9CC18F]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[#1B3B1A]">Jeune / Adulte</p>
                    <p className="text-xs text-gray-500">16 ans et plus</p>
                  </button>
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  form.categorieChoix === 'enfant' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Âge exact</label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={form.ageExact}
                  onChange={e => majChamp('ageExact', e.target.value)}
                  className={champBase}
                  placeholder="Ex : 12"
                />
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  form.categorieChoix === 'adulte' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Tranche d'âge</label>
                <select
                  value={form.trancheAge}
                  onChange={e => majChamp('trancheAge', e.target.value as TrancheAge)}
                  className={`${champBase} bg-white`}
                >
                  <option value="">Sélectionner...</option>
                  <option value="16-19">16 - 19 ans</option>
                  <option value="20-25">20 - 25 ans</option>
                  <option value="26-30">26 - 30 ans</option>
                  <option value="31-40">31 - 40 ans</option>
                  <option value="41-49">41 - 49 ans</option>
                  <option value="50+">50 ans et plus</option>
                </select>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  form.categorieChoix !== '' ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-[#D9A441]/15 border border-[#D9A441] px-4 py-2">
                  <span className="text-sm font-semibold text-[#8A6A23]">Tarif applicable :</span>
                  <span className="text-sm font-bold text-[#8A6A23]">{formatFCFA(montantAPayer)}</span>
                </div>
              </div>
            </div>
          )}

          {etape === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[#1B3B1A]">Origine &amp; profil</h2>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Numéro de téléphone</label>
                <input
                  type="tel"
                  value={form.telephone}
                  onChange={e => majChamp('telephone', e.target.value)}
                  className={champBase}
                  placeholder="Ex : 07 00 00 00 00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Occupation ou fonction</label>
                <input
                  type="text"
                  value={form.occupation}
                  onChange={e => majChamp('occupation', e.target.value)}
                  className={champBase}
                  placeholder="Ex : Étudiant, Enseignant..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Pays</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['CI', 'autre'] as Pays[]).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => majChamp('pays', p)}
                      className={carteChoix(form.pays === p)}
                    >
                      {p === 'CI' ? "Côte d'Ivoire" : 'Autre pays'}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  form.pays === 'autre' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Précisez le pays</label>
                <input
                  type="text"
                  value={form.paysPrecision}
                  onChange={e => majChamp('paysPrecision', e.target.value)}
                  className={champBase}
                  placeholder="Ex : Sénégal"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Ville</label>
                  <input
                    type="text"
                    value={form.ville}
                    onChange={e => majChamp('ville', e.target.value)}
                    className={champBase}
                    placeholder="Ex : Abidjan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Commune / Quartier</label>
                  <input
                    type="text"
                    value={form.communeQuartier}
                    onChange={e => majChamp('communeQuartier', e.target.value)}
                    className={champBase}
                    placeholder="Ex : Cocody"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Taille de polo</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {TAILLES_POLO.map(taille => (
                    <button
                      key={taille}
                      type="button"
                      onClick={() => majChamp('taillePolo', taille)}
                      className={carteChoix(form.taillePolo === taille).replace('px-4 py-3', 'py-2')}
                    >
                      {taille}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {etape === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[#1B3B1A]">Profil médical &amp; historique</h2>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Antécédents médicaux</label>
                <textarea
                  value={form.antecedentsMedicaux}
                  onChange={e => majChamp('antecedentsMedicaux', e.target.value)}
                  rows={3}
                  className={champBase}
                  placeholder="Écrire « Aucun » si pas d'antécédents"
                />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <span className="text-sm font-medium text-[#1B3B1A]">
                  Avez-vous déjà participé à un camp des Navigateurs ?
                </span>
                <button
                  type="button"
                  onClick={() => majChamp('dejaParticipe', !form.dejaParticipe)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ml-3 ${
                    form.dejaParticipe ? 'bg-[#4F8A3D]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                      form.dejaParticipe ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">
                  Pourquoi souhaitez-vous participer ?
                </label>
                <textarea
                  value={form.motivation}
                  onChange={e => majChamp('motivation', e.target.value)}
                  rows={4}
                  className={champBase}
                  placeholder="Partagez votre motivation..."
                />
              </div>
            </div>
          )}

          {etape === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-[#1B3B1A]">Recommandation &amp; urgence</h2>

              <div>
                <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Avez-vous été invité ?</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['oui', 'non'] as ChoixOuiNon[]).map(choix => (
                    <button
                      key={choix}
                      type="button"
                      onClick={() => majChamp('invite', choix)}
                      className={carteChoix(form.invite === choix)}
                    >
                      {choix === 'oui' ? 'Oui' : 'Non'}
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={`overflow-hidden transition-all duration-300 ${
                  form.invite === 'oui' ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom du référent</label>
                <input
                  type="text"
                  value={form.nomReferent}
                  onChange={e => majChamp('nomReferent', e.target.value)}
                  className={champBase}
                  placeholder="Nom de la personne qui vous a invité"
                />
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-[#1B3B1A] mb-3">Contact d'urgence</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom complet</label>
                    <input
                      type="text"
                      value={form.contactUrgenceNom}
                      onChange={e => majChamp('contactUrgenceNom', e.target.value)}
                      className={champBase}
                      placeholder="Ex : Marie Koffi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={form.contactUrgenceTelephone}
                      onChange={e => majChamp('contactUrgenceTelephone', e.target.value)}
                      className={champBase}
                      placeholder="Ex : 05 00 00 00 00"
                    />
                  </div>
                </div>
              </div>

              {erreurEnvoi && (
                <p className="text-sm font-medium text-[#B3492F] bg-[#B3492F]/10 rounded-lg px-3 py-2">
                  {erreurEnvoi}
                </p>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
            <button
              type="button"
              onClick={precedent}
              disabled={etape === 1}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                etape === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-[#1B3B1A] hover:bg-[#E7F2DE]'
              }`}
            >
              Retour
            </button>

            {etape < totalEtapes ? (
              <button
                type="button"
                onClick={suivant}
                disabled={!etapeValide}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
                  etapeValide ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Suivant
              </button>
            ) : (
              <button
                type="button"
                onClick={soumettre}
                disabled={!etape4Valide || envoiEnCours}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
                  etape4Valide && !envoiEnCours ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {envoiEnCours ? 'Envoi...' : "Confirmer l'inscription"}
              </button>
            )}
          </div>
        </div>

        {/* Récapitulatif financier — toujours visible */}
        {montantAPayer > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-[#E7F2DE] shadow-sm px-5 py-4 flex items-center justify-between">
            <span className="text-sm text-[#5B7A56] font-medium">Montant total à payer</span>
            <span className="text-lg font-bold text-[#1B3B1A]">{formatFCFA(montantAPayer)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

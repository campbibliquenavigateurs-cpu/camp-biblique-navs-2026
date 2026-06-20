import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { usePlacesDispo } from '../hooks/usePlacesDispo'
import GuideTailles from './GuideTailles'
import { formatFCFA } from '../utils/format'

// ============================================================
// Camp Biblique-Navs 2026 — Formulaire d'inscription (Phase 5)
// Illustrations SVG par étape, transitions animées, anti-doublon,
// compteurs de places en temps réel.
// ============================================================

// ---- Animations CSS ----
const STYLES = `
  @keyframes slideIn  { from { opacity:0; transform:translateX(20px);  } to { opacity:1; transform:translateX(0); } }
  @keyframes slideOut { from { opacity:0; transform:translateX(-20px); } to { opacity:1; transform:translateX(0); } }
  @keyframes successPop { 0%{opacity:0;transform:scale(.85)} 70%{transform:scale(1.04)} 100%{opacity:1;transform:scale(1)} }
  .step-enter      { animation: slideIn  .25s ease-out both; }
  .step-enter-back { animation: slideOut .25s ease-out both; }
  .success-pop     { animation: successPop .5s ease-out both; }
  .champ-ok { border-color:#4F8A3D; transition:border-color .2s; }
`

// ---- Types ----
type Genre = 'M' | 'F' | ''
type CategorieChoix = 'enfant' | 'adulte' | ''
type TrancheAge = '16-19'|'20-25'|'26-30'|'31-40'|'41-49'|'50+'|''
type TaillePolo = 'XS'|'S'|'M'|'L'|'XL'|'XXL'|''
type ChoixOuiNon = 'oui'|'non'|''
type Pays = 'CI'|'autre'|''

interface InscriptionFormData {
  nom:string; prenoms:string; genre:Genre; categorieChoix:CategorieChoix
  ageExact:string; trancheAge:TrancheAge; telephone:string; occupation:string
  pays:Pays; paysPrecision:string; ville:string; communeQuartier:string
  taillePolo:TaillePolo; antecedentsMedicaux:string; dejaParticipe:boolean
  motivation:string; invite:ChoixOuiNon; nomReferent:string
  contactUrgenceNom:string; contactUrgenceTelephone:string
}

interface ResultatConsultation {
  categorie:string; statut_paiement:string; montant_paye:number; montant_du:number; date_inscription:string
}

const FORM_INITIAL: InscriptionFormData = {
  nom:'',prenoms:'',genre:'',categorieChoix:'',ageExact:'',trancheAge:'',
  telephone:'',occupation:'',pays:'',paysPrecision:'',ville:'',communeQuartier:'',
  taillePolo:'',antecedentsMedicaux:'',dejaParticipe:false,motivation:'',
  invite:'',nomReferent:'',contactUrgenceNom:'',contactUrgenceTelephone:''
}

const TRANCHES_AGE_MIN: Record<Exclude<TrancheAge,''>,number> = {
  '16-19':16,'20-25':20,'26-30':26,'31-40':31,'41-49':41,'50+':50
}

const TAILLES_POLO: TaillePolo[] = ['XS','S','M','L','XL','XXL']
const PRIX = { enfant:25000, adulte:30000 } as const


function normaliserTelephone(val:string): string {
  let c = val.replace(/\D/g,'')
  if(c.startsWith('225')&&c.length>10) c=c.slice(-10)
  return c
}

// ---- Illustrations SVG ----
const IllustrationEtape1 = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    <circle cx="100" cy="40" r="60" fill="#E7F2DE" opacity=".5"/>
    {/* Adulte 1 */}
    <circle cx="70" cy="75" r="16" fill="#4F8A3D"/>
    <path d="M52 130 Q70 110 88 130 L88 165 Q70 175 52 165Z" fill="#4F8A3D"/>
    {/* Adulte 2 */}
    <circle cx="130" cy="75" r="16" fill="#1B3B1A"/>
    <path d="M112 130 Q130 110 148 130 L148 165 Q130 175 112 165Z" fill="#1B3B1A"/>
    {/* Enfant gauche */}
    <circle cx="38" cy="95" r="10" fill="#9CC18F"/>
    <path d="M28 130 Q38 118 48 130 L48 155 Q38 162 28 155Z" fill="#9CC18F"/>
    {/* Enfant droite */}
    <circle cx="162" cy="95" r="10" fill="#D9A441"/>
    <path d="M152 130 Q162 118 172 130 L172 155 Q162 162 152 155Z" fill="#D9A441"/>
    {/* Mains reliées */}
    <path d="M52 138 Q45 138 38 135" stroke="#4F8A3D" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M148 138 Q155 138 162 135" stroke="#1B3B1A" strokeWidth="3" strokeLinecap="round" fill="none"/>
    <path d="M88 138 L112 138" stroke="#D9A441" strokeWidth="3" strokeLinecap="round" fill="none"/>
    {/* Bible */}
    <rect x="88" y="170" width="24" height="18" rx="2" fill="#D9A441"/>
    <line x1="100" y1="170" x2="100" y2="188" stroke="#1B3B1A" strokeWidth="1.5"/>
  </svg>
)

const IllustrationEtape2 = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    <ellipse cx="100" cy="160" rx="70" ry="20" fill="#E7F2DE" opacity=".6"/>
    {/* Globe / carte */}
    <circle cx="100" cy="90" r="55" fill="#E7F2DE" stroke="#4F8A3D" strokeWidth="2"/>
    <path d="M100 35 Q115 60 115 90 Q115 120 100 145 Q85 120 85 90 Q85 60 100 35Z" fill="#9CC18F"/>
    <path d="M45 90 Q70 80 100 90 Q130 100 155 90" stroke="#4F8A3D" strokeWidth="1.5" fill="none"/>
    <path d="M50 65 Q75 62 100 65 Q125 68 150 65" stroke="#9CC18F" strokeWidth="1" fill="none"/>
    <path d="M50 115 Q75 118 100 115 Q125 112 150 115" stroke="#9CC18F" strokeWidth="1" fill="none"/>
    {/* Pin de localisation */}
    <circle cx="100" cy="82" r="8" fill="#D9A441"/>
    <path d="M100 90 L100 108" stroke="#D9A441" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="100" cy="82" r="3" fill="white"/>
  </svg>
)

const IllustrationEtape3 = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    <circle cx="100" cy="100" r="65" fill="#E7F2DE" opacity=".5"/>
    {/* Bouclier */}
    <path d="M100 40 L150 60 L150 110 Q150 145 100 165 Q50 145 50 110 L50 60Z" fill="#4F8A3D"/>
    <path d="M100 50 L142 68 L142 110 Q142 138 100 155 Q58 138 58 110 L58 68Z" fill="#E7F2DE"/>
    {/* Croix médicale */}
    <rect x="91" y="80" width="18" height="50" rx="4" fill="#4F8A3D"/>
    <rect x="75" y="96" width="50" height="18" rx="4" fill="#4F8A3D"/>
    {/* Petites étoiles de guérison */}
    <circle cx="155" cy="55" r="4" fill="#D9A441"/>
    <circle cx="45" cy="55" r="4" fill="#D9A441"/>
    <circle cx="165" cy="90" r="3" fill="#9CC18F"/>
  </svg>
)

const IllustrationEtape4 = () => (
  <svg viewBox="0 0 200 200" className="w-full h-full" aria-hidden="true">
    {/* Réseau — Jean 1:40-42 : André, Pierre, Jésus */}
    <circle cx="100" cy="170" r="7" fill="#E7F2DE" opacity=".6"/>
    {/* Nœuds */}
    <circle cx="100" cy="50" r="22" fill="#D9A441"/>  {/* Centre/Jésus */}
    <circle cx="45" cy="140" r="18" fill="#4F8A3D"/>  {/* André */}
    <circle cx="155" cy="140" r="18" fill="#1B3B1A"/> {/* Pierre */}
    {/* Lignes de connexion */}
    <line x1="100" y1="72" x2="57" y2="124" stroke="#4F8A3D" strokeWidth="2.5" strokeDasharray="5 3"/>
    <line x1="100" y1="72" x2="143" y2="124" stroke="#1B3B1A" strokeWidth="2.5" strokeDasharray="5 3"/>
    <line x1="63" y1="140" x2="137" y2="140" stroke="#D9A441" strokeWidth="2" strokeDasharray="4 3"/>
    {/* Icônes simplifiées dans les nœuds */}
    <text x="100" y="56" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">J</text>
    <text x="45" y="146" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">A</text>
    <text x="155" y="146" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">P</text>
    {/* Référence */}
    <text x="100" y="190" textAnchor="middle" fontSize="8" fill="#9CC18F">Jean 1 : 40–42</text>
  </svg>
)

const ILLUSTRATIONS = [IllustrationEtape1, IllustrationEtape2, IllustrationEtape3, IllustrationEtape4]

const champBase = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent transition-colors duration-200'

const carteChoix = (actif:boolean) =>
  `rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all duration-200 ${
    actif ? 'border-[#4F8A3D] bg-[#E7F2DE] text-[#1B3B1A]' : 'border-gray-200 text-gray-500 hover:border-[#9CC18F]'
  }`

export default function InscriptionForm() {
  const toast = useToast()
  const places = usePlacesDispo()
  const [etape, setEtape] = useState(1)
  const [direction, setDirection] = useState<'avancer'|'reculer'>('avancer')
  const [form, setForm] = useState<InscriptionFormData>(FORM_INITIAL)
  const [envoiEnCours, setEnvoiEnCours] = useState(false)
  const [succes, setSucces] = useState(false)
  const [doublonDetecte, setDoublonDetecte] = useState(false)
  const [consultationResultat, setConsultationResultat] = useState<ResultatConsultation|null>(null)
  const [consultationErreur, setConsultationErreur] = useState('')
  const totalEtapes = 4

  const Illustration = ILLUSTRATIONS[etape - 1]

  function maj<K extends keyof InscriptionFormData>(champ:K, valeur:InscriptionFormData[K]) {
    setForm(prev=>({...prev,[champ]:valeur}))
  }

  const montantAPayer = form.categorieChoix==='enfant' ? PRIX.enfant : form.categorieChoix==='adulte' ? PRIX.adulte : 0
  const telValide = (v:string) => normaliserTelephone(v).length===10

  const etape1Valide =
    form.nom.trim()!==''&&form.prenoms.trim()!==''&&form.genre!==''&&form.categorieChoix!==''&&
    (form.categorieChoix==='enfant'
      ? form.ageExact!==''&&Number(form.ageExact)>=0&&Number(form.ageExact)<=15
      : form.trancheAge!=='') &&
    // Blocage si la catégorie choisie est complète
    !(form.categorieChoix==='adulte'&&places?.complet.adultes) &&
    !(form.categorieChoix==='enfant'&&places?.complet.enfants)

  const etape2Valide =
    telValide(form.telephone)&&form.occupation.trim()!==''&&form.pays!==''&&
    (form.pays==='autre'?form.paysPrecision.trim()!=='':true)&&
    form.ville.trim()!==''&&form.communeQuartier.trim()!==''&&form.taillePolo!==''

  const etape3Valide = form.antecedentsMedicaux.trim()!==''&&form.motivation.trim()!==''

  const etape4Valide =
    (form.invite==='oui'?form.nomReferent.trim()!=='':form.invite!=='')&&
    form.contactUrgenceNom.trim()!==''&&telValide(form.contactUrgenceTelephone)

  const etapeValide = etape===1?etape1Valide:etape===2?etape2Valide:etape===3?etape3Valide:etape4Valide

  function suivant() { if(etapeValide&&etape<totalEtapes){ setDirection('avancer'); setEtape(e=>e+1) } }
  function precedent() { if(etape>1){ setDirection('reculer'); setEtape(e=>e-1) } }

  function calculerDateNaissance(): string {
    const age = form.categorieChoix==='enfant'
      ? Number(form.ageExact)
      : TRANCHES_AGE_MIN[form.trancheAge as Exclude<TrancheAge,''>] ?? 16
    const d = new Date()
    d.setFullYear(d.getFullYear()-age)
    return d.toISOString().slice(0,10)
  }

  async function soumettre() {
    if(!etape4Valide) return
    setEnvoiEnCours(true)
    const tel = normaliserTelephone(form.telephone)

    const {data:doublon, error:errVerif} = await supabase.rpc('verifier_doublon_inscription',{
      p_nom:form.nom, p_prenoms:form.prenoms, p_telephone:tel
    })
    if(errVerif){ setEnvoiEnCours(false); toast.erreur('Erreur lors de la vérification. Réessayez.'); return }
    if(doublon){ setEnvoiEnCours(false); setDoublonDetecte(true); return }

    const {error} = await supabase.from('inscriptions').insert({
      nom:form.nom.trim(), prenoms:form.prenoms.trim(), genre:form.genre,
      date_naissance:calculerDateNaissance(), telephone:tel,
      occupation:form.occupation.trim(),
      pays:form.pays==='autre'?form.paysPrecision.trim():"Côte d'Ivoire",
      ville:form.ville.trim(), commune_quartier:form.communeQuartier.trim(),
      taille_polo:form.taillePolo, antecedents_medicaux:form.antecedentsMedicaux.trim(),
      deja_participe:form.dejaParticipe, motivation:form.motivation.trim(),
      invite_par_referent:form.invite==='oui'?form.nomReferent.trim():null,
      contact_urgence_nom:form.contactUrgenceNom.trim(),
      contact_urgence_telephone:normaliserTelephone(form.contactUrgenceTelephone),
      montant_du:montantAPayer,
    })
    setEnvoiEnCours(false)
    if(error){ toast.erreur('Une erreur est survenue. Merci de réessayer.'); console.error(error) }
    else setSucces(true)
  }

  async function consulterMonInscription() {
    setConsultationErreur('')
    const {data, error} = await supabase.rpc('consulter_inscription',{
      p_nom:form.nom, p_prenoms:form.prenoms, p_telephone:normaliserTelephone(form.telephone)
    })
    if(error||!data||data.length===0){ setConsultationErreur('Aucune inscription trouvée avec ces informations.'); return }
    setConsultationResultat(data[0] as ResultatConsultation)
  }

  // ---- Écran de succès ----
  if(succes) return (
    <div className="min-h-screen bg-[#1B3B1A] flex items-center justify-center px-4">
      <style>{STYLES}</style>
      <div className="success-pop bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center border border-[#E7F2DE]">
        <div className="w-20 h-20 rounded-full bg-[#E7F2DE] flex items-center justify-center mx-auto mb-5">
          <svg className="w-10 h-10 text-[#4F8A3D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#1B3B1A] mb-2">Bienvenue, {form.prenoms} !</h2>
        <p className="text-gray-600 text-sm mb-4">
          Votre inscription au Camp Biblique-Navs 2026 a bien été enregistrée.
          Le comité vous contactera pour la suite du processus de paiement.
        </p>
        <div className="bg-[#F4F9F0] rounded-xl p-4 text-sm italic text-[#4F8A3D]">
          « L'un des deux qui avaient entendu les paroles de Jean et qui avaient suivi Jésus, était André, frère de Simon Pierre. Il trouva d'abord Simon, son propre frère, et lui dit : "Nous avons trouvé le Messie." »
          <p className="text-xs text-gray-400 mt-2 not-italic">Jean 1 : 40-41</p>
        </div>
      </div>
    </div>
  )

  // ---- Écran doublon ----
  if(doublonDetecte) return (
    <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-[#D9A441]">
        <div className="w-16 h-16 rounded-full bg-[#D9A441]/15 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#8A6A23]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 className="text-lg font-bold text-[#1B3B1A] mb-2">Inscription déjà existante</h2>
        <p className="text-gray-600 text-sm mb-5">
          Il semble que vous soyez déjà inscrit(e) pour le camp de cette année.
          Cliquez sur « Consulter mon inscription » pour vérifier votre statut.
        </p>
        {!consultationResultat ? (
          <>
            <button type="button" onClick={consulterMonInscription}
              className="w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] mb-3">
              Consulter mon inscription
            </button>
            {consultationErreur && <p className="text-xs text-[#B3492F] mb-3">{consultationErreur}</p>}
          </>
        ) : (
          <div className="text-left bg-[#F4F9F0] rounded-xl p-4 mb-4 space-y-1.5 text-sm">
            <p><span className="text-gray-500">Catégorie : </span><span className="font-semibold text-[#1B3B1A]">{consultationResultat.categorie}</span></p>
            <p><span className="text-gray-500">Statut : </span><span className="font-semibold text-[#1B3B1A]">{consultationResultat.statut_paiement ?? 'En attente'}</span></p>
            <p><span className="text-gray-500">Montant payé : </span><span className="font-semibold text-[#1B3B1A]">{(consultationResultat.montant_paye||0).toLocaleString('fr-FR')+' F CFA'}</span></p>
          </div>
        )}
        <button type="button" onClick={()=>{setDoublonDetecte(false);setConsultationResultat(null);setConsultationErreur('')}}
          className="text-sm text-[#5B7A56] hover:underline">
          Modifier mes informations
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <style>{STYLES}</style>
      <div className="max-w-3xl mx-auto">

        {/* Barre de progression */}
        <div className="mb-8 max-w-xl mx-auto">
          <div className="flex items-center">
            {[1,2,3,4].map((num,idx)=>(
              <div key={num} className="flex items-center flex-1 last:flex-none">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shrink-0 ${num<=etape?'bg-[#4F8A3D] text-white shadow-md':'bg-[#E7F2DE] text-[#7AA876]'}`}>
                  {num<etape?(
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                    </svg>
                  ):num}
                </div>
                {idx<3&&(
                  <div className="flex-1 h-1 mx-2 rounded-full overflow-hidden bg-[#E7F2DE]">
                    <div className="h-full bg-[#4F8A3D] transition-all duration-500 ease-out" style={{width:num<etape?'100%':'0%'}}/>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#5B7A56] mt-3 font-medium">Étape {etape} sur {totalEtapes}</p>
        </div>

        {/* Corps : illustration + formulaire */}
        <div className="flex gap-6 items-start max-w-3xl mx-auto">

          {/* Illustration — masquée sur mobile */}
          <div className="hidden lg:flex flex-col items-center w-48 shrink-0 pt-4">
            <div key={etape} className="step-enter w-40 h-40">
              <Illustration/>
            </div>
            <p className="text-xs text-center text-gray-400 mt-3 leading-relaxed">
              {etape===1&&'Bienvenue ! Dites-nous qui vous êtes.'}
              {etape===2&&"D'où venez-vous ? Partagez votre profil."}
              {etape===3&&'Votre santé, notre priorité.'}
              {etape===4&&'Rejoindre le réseau des disciples.'}
            </p>
          </div>

          {/* Formulaire */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-md border border-[#E7F2DE] p-6 sm:p-8">

              <div key={etape} className={direction==='avancer'?'step-enter':'step-enter-back'}>

                {etape===1&&(
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-[#1B3B1A]">Identité &amp; catégorie</h2>

                    {/* Compteurs de places dans l'étape 1 */}
                    {places&&(
                      <div className="bg-[#F4F9F0] rounded-xl p-3 space-y-2">
                        <p className="text-xs font-semibold text-[#5B7A56] mb-1">Places restantes</p>
                        {[
                          {label:'Adultes 16+', restant:places.restantAdultes, taux:places.tauxRemplissage.adultes},
                          {label:'Enfants 0-15', restant:places.restantEnfants, taux:places.tauxRemplissage.enfants},
                        ].map(({label,restant,taux})=>{
                          const c = taux>=90?'bg-[#B3492F]':taux>=70?'bg-[#D9A441]':'bg-[#4F8A3D]'
                          return (
                            <div key={label} className="flex items-center gap-3">
                              <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                              <div className="flex-1 h-1.5 rounded-full bg-[#E7F2DE] overflow-hidden">
                                <div className={`h-full rounded-full ${c}`} style={{width:`${Math.min(taux,100)}%`}}/>
                              </div>
                              <span className={`text-xs font-bold w-14 text-right ${restant===0?'text-[#B3492F]':'text-[#4F8A3D]'}`}>
                                {restant===0?'Complet':`${restant} pl.`}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom</label>
                      <input type="text" value={form.nom} onChange={e=>maj('nom',e.target.value)}
                        className={`${champBase} ${form.nom.trim()!==''?'champ-ok':''}`} placeholder="Ex : Kouassi"/>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Prénoms</label>
                      <input type="text" value={form.prenoms} onChange={e=>maj('prenoms',e.target.value)}
                        className={`${champBase} ${form.prenoms.trim()!==''?'champ-ok':''}`} placeholder="Ex : Jean-Marc"/>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Genre</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['M','F'] as Genre[]).map(g=>(
                          <button key={g} type="button" onClick={()=>maj('genre',g)} className={carteChoix(form.genre===g)}>
                            {g==='M'?'Masculin':'Féminin'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Catégorie</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {val:'enfant'as CategorieChoix, titre:'Enfant / Ado', desc:'0 à 15 ans', complet:places?.complet.enfants},
                          {val:'adulte'as CategorieChoix, titre:'Jeune / Adulte', desc:'16 ans et plus', complet:places?.complet.adultes},
                        ].map(({val,titre,desc,complet})=>(
                          <button key={val} type="button"
                            onClick={()=>!complet&&maj('categorieChoix',val)}
                            disabled={!!complet}
                            className={`rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 relative ${
                              complet?'border-gray-200 opacity-50 cursor-not-allowed':
                              form.categorieChoix===val?'border-[#4F8A3D] bg-[#E7F2DE]':'border-gray-200 hover:border-[#9CC18F]'
                            }`}>
                            <p className="text-sm font-semibold text-[#1B3B1A]">{titre}</p>
                            <p className="text-xs text-gray-500">{desc}</p>
                            {complet&&<span className="absolute top-2 right-2 text-[10px] text-[#B3492F] font-bold">Complet</span>}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${form.categorieChoix==='enfant'?'max-h-40 opacity-100':'max-h-0 opacity-0'}`}>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Âge exact</label>
                      <input type="number" min={0} max={15} value={form.ageExact} onChange={e=>maj('ageExact',e.target.value)} className={champBase} placeholder="Ex : 12"/>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${form.categorieChoix==='adulte'?'max-h-40 opacity-100':'max-h-0 opacity-0'}`}>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Tranche d'âge</label>
                      <select value={form.trancheAge} onChange={e=>maj('trancheAge',e.target.value as TrancheAge)} className={`${champBase} bg-white`}>
                        <option value="">Sélectionner...</option>
                        {(['16-19','20-25','26-30','31-40','41-49','50+'] as TrancheAge[]).map(t=>(
                          <option key={t} value={t}>{t==='50+'?'50 ans et plus':`${t} ans`}</option>
                        ))}
                      </select>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${form.categorieChoix!==''?'max-h-20 opacity-100':'max-h-0 opacity-0'}`}>
                      <div className="inline-flex items-center gap-2 rounded-full bg-[#D9A441]/15 border border-[#D9A441] px-4 py-2">
                        <span className="text-sm font-semibold text-[#8A6A23]">Tarif applicable :</span>
                        <span className="text-sm font-bold text-[#8A6A23]">{formatFCFA(montantAPayer)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {etape===2&&(
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-[#1B3B1A]">Origine &amp; profil</h2>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Numéro de téléphone</label>
                      <input type="tel" value={form.telephone} onChange={e=>maj('telephone',e.target.value)}
                        className={`${champBase} ${telValide(form.telephone)?'champ-ok':''}`} placeholder="Ex : 07 00 00 00 00"/>
                      {form.telephone!==''&&!telValide(form.telephone)&&(
                        <p className="text-xs text-[#B3492F] mt-1">Numéro invalide — 10 chiffres attendus</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Occupation ou fonction</label>
                      <input type="text" value={form.occupation} onChange={e=>maj('occupation',e.target.value)}
                        className={`${champBase} ${form.occupation.trim()!==''?'champ-ok':''}`} placeholder="Ex : Étudiant, Enseignant..."/>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Pays</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['CI','autre'] as Pays[]).map(p=>(
                          <button key={p} type="button" onClick={()=>maj('pays',p)} className={carteChoix(form.pays===p)}>
                            {p==='CI'?"Côte d'Ivoire":'Autre pays'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${form.pays==='autre'?'max-h-40 opacity-100':'max-h-0 opacity-0'}`}>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Précisez le pays</label>
                      <input type="text" value={form.paysPrecision} onChange={e=>maj('paysPrecision',e.target.value)} className={champBase} placeholder="Ex : Sénégal"/>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Ville</label>
                        <input type="text" value={form.ville} onChange={e=>maj('ville',e.target.value)}
                          className={`${champBase} ${form.ville.trim()!==''?'champ-ok':''}`} placeholder="Ex : Abidjan"/>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Commune / Quartier</label>
                        <input type="text" value={form.communeQuartier} onChange={e=>maj('communeQuartier',e.target.value)}
                          className={`${champBase} ${form.communeQuartier.trim()!==''?'champ-ok':''}`} placeholder="Ex : Cocody"/>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-[#1B3B1A]">Taille de polo</label>
                        <GuideTailles tailleSelectionnee={form.taillePolo} />
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {TAILLES_POLO.map(t=>(
                          <button key={t} type="button" onClick={()=>maj('taillePolo',t)}
                            className={carteChoix(form.taillePolo===t).replace('px-4 py-3','py-2')}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {etape===3&&(
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-[#1B3B1A]">Profil médical &amp; historique</h2>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Antécédents médicaux</label>
                      <textarea value={form.antecedentsMedicaux} onChange={e=>maj('antecedentsMedicaux',e.target.value)}
                        rows={3} className={`${champBase} ${form.antecedentsMedicaux.trim()!==''?'champ-ok':''}`}
                        placeholder="Écrire « Aucun » si pas d'antécédents"/>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                      <span className="text-sm font-medium text-[#1B3B1A]">Déjà participé à un camp des Navigateurs ?</span>
                      <button type="button" onClick={()=>maj('dejaParticipe',!form.dejaParticipe)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 shrink-0 ml-3 ${form.dejaParticipe?'bg-[#4F8A3D]':'bg-gray-300'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${form.dejaParticipe?'translate-x-6':'translate-x-1'}`}/>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Pourquoi souhaitez-vous participer ?</label>
                      <textarea value={form.motivation} onChange={e=>maj('motivation',e.target.value)}
                        rows={4} className={`${champBase} ${form.motivation.trim()!==''?'champ-ok':''}`} placeholder="Partagez votre motivation..."/>
                    </div>
                  </div>
                )}

                {etape===4&&(
                  <div className="space-y-5">
                    <h2 className="text-lg font-bold text-[#1B3B1A]">Recommandation &amp; urgence</h2>

                    <div>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-2">Avez-vous été invité ?</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['oui','non'] as ChoixOuiNon[]).map(c=>(
                          <button key={c} type="button" onClick={()=>maj('invite',c)} className={carteChoix(form.invite===c)}>
                            {c==='oui'?'Oui':'Non'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={`overflow-hidden transition-all duration-300 ${form.invite==='oui'?'max-h-40 opacity-100':'max-h-0 opacity-0'}`}>
                      <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom du référent</label>
                      <input type="text" value={form.nomReferent} onChange={e=>maj('nomReferent',e.target.value)}
                        className={champBase} placeholder="Nom de la personne qui vous a invité"/>
                    </div>

                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-sm font-semibold text-[#1B3B1A] mb-3">Contact d'urgence</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom complet</label>
                          <input type="text" value={form.contactUrgenceNom} onChange={e=>maj('contactUrgenceNom',e.target.value)}
                            className={`${champBase} ${form.contactUrgenceNom.trim()!==''?'champ-ok':''}`} placeholder="Ex : Marie Koffi"/>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Téléphone</label>
                          <input type="tel" value={form.contactUrgenceTelephone} onChange={e=>maj('contactUrgenceTelephone',e.target.value)}
                            className={`${champBase} ${telValide(form.contactUrgenceTelephone)?'champ-ok':''}`} placeholder="Ex : 05 00 00 00 00"/>
                          {form.contactUrgenceTelephone!==''&&!telValide(form.contactUrgenceTelephone)&&(
                            <p className="text-xs text-[#B3492F] mt-1">Numéro invalide — 10 chiffres attendus</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>{/* /step content */}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100">
                <button type="button" onClick={precedent} disabled={etape===1}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${etape===1?'text-gray-300 cursor-not-allowed':'text-[#1B3B1A] hover:bg-[#E7F2DE]'}`}>
                  Retour
                </button>
                {etape<totalEtapes?(
                  <button type="button" onClick={suivant} disabled={!etapeValide}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-200 ${etapeValide?'bg-[#4F8A3D] hover:bg-[#3F7530] animate-bounce':'bg-gray-300 cursor-not-allowed'}`}>
                    Suivant
                  </button>
                ):(
                  <button type="button" onClick={soumettre} disabled={!etape4Valide||envoiEnCours}
                    className={`px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${etape4Valide&&!envoiEnCours?'bg-[#4F8A3D] hover:bg-[#3F7530]':'bg-gray-300 cursor-not-allowed'}`}>
                    {envoiEnCours?'Vérification...':'Confirmer l\'inscription'}
                  </button>
                )}
              </div>
            </div>

            {/* Récapitulatif financier */}
            {montantAPayer>0&&(
              <div className="mt-4 bg-white rounded-xl border border-[#E7F2DE] shadow-sm px-5 py-4 flex items-center justify-between">
                <span className="text-sm text-[#5B7A56] font-medium">Montant total à payer</span>
                <span className="text-lg font-bold text-[#1B3B1A]">{formatFCFA(montantAPayer)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

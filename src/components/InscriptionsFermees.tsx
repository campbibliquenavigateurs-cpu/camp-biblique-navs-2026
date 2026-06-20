import { useState } from 'react'
import { Hourglass, CheckCircle2, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

// ============================================================
// Camp Biblique-Navs 2026 — Écran de clôture des inscriptions (Phase 13)
// Remplace le formulaire public quand l'admin a fermé les
// inscriptions. Arrière-plan animé en CSS pur (formes floues qui
// flottent doucement), sans dégradé plat, pour rester léger sur
// mobile (aucune librairie d'animation, juste des transitions CSS).
// ============================================================

const STYLES = `
  @keyframes flotter1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(20px, -15px) scale(1.08); }
  }
  @keyframes flotter2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-15px, 20px) scale(1.05); }
  }
  @keyframes iconeApparition {
    from { opacity: 0; transform: scale(0.6); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes coutourReveal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .forme-flottante-1 { animation: flotter1 8s ease-in-out infinite; }
  .forme-flottante-2 { animation: flotter2 10s ease-in-out infinite; }
  .icone-cloture { animation: iconeApparition 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
  .reveal-doux { animation: coutourReveal 0.4s ease-out both; }
`

const NUMERO_SECRETARIAT = '2250789588315'
const MESSAGE_WHATSAPP = encodeURIComponent(
  "Bonjour Dave, les inscriptions au Camp Biblique-Navs 2026 sont actuellement fermées. " +
  "Je souhaiterais faire une demande d'inscription exceptionnelle. Merci de votre retour."
)

export default function InscriptionsFermees() {
  const toast = useToast()
  const [formulaireOuvert, setFormulaireOuvert] = useState(false)
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [succes, setSucces] = useState(false)

  function normaliserTelephone(val: string): string {
    let c = val.replace(/\D/g, '')
    if (c.startsWith('225') && c.length > 10) c = c.slice(-10)
    return c
  }

  const telValide = normaliserTelephone(telephone).length === 10
  const valide = nom.trim() !== '' && telValide

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = await supabase.from('liste_attente').insert({
      nom: nom.trim(),
      telephone: normaliserTelephone(telephone),
    })
    setEnvoi(false)
    if (error) {
      toast.erreur('Une erreur est survenue. Merci de réessayer.')
      return
    }
    setSucces(true)
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <style>{STYLES}</style>

      {/* Arrière-plan animé subtil — formes floues, pas de dégradé plat */}
      <div className="forme-flottante-1 absolute -top-10 -left-10 w-56 h-56 rounded-full bg-[#9CC18F]/20 blur-3xl pointer-events-none" />
      <div className="forme-flottante-2 absolute bottom-0 right-0 w-64 h-64 rounded-full bg-[#D9A441]/15 blur-3xl pointer-events-none" />

      <div className="relative max-w-md w-full bg-white rounded-2xl shadow-xl border border-[#E7F2DE] p-8 text-center">
        <div className="icone-cloture w-20 h-20 rounded-full bg-[#E7F2DE] flex items-center justify-center mx-auto mb-5">
          <Hourglass className="w-9 h-9 text-[#4F8A3D]" strokeWidth={1.7} />
        </div>

        <h1 className="text-xl font-bold text-[#1B3B1A] mb-2">Inscriptions closes</h1>
        <p className="text-sm text-gray-500 mb-6">
          Les inscriptions au Camp Biblique-Navs 2026 ne sont plus ouvertes pour le moment.
        </p>

        {!formulaireOuvert && !succes && (
          <div className="reveal-doux space-y-3">
            <button
              type="button"
              onClick={() => setFormulaireOuvert(true)}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] transition-colors duration-200"
            >
              S'inscrire sur la liste d'attente
            </button>
            <a
              href={`https://wa.me/${NUMERO_SECRETARIAT}?text=${MESSAGE_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-[#1B3B1A] border border-[#1B3B1A] hover:bg-[#F4F9F0] transition-colors duration-200"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.8} />
              Contacter le secrétariat sur WhatsApp
            </a>
          </div>
        )}

        {formulaireOuvert && !succes && (
          <div className="reveal-doux space-y-3 text-left">
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Nom complet</label>
              <input
                type="text"
                value={nom}
                onChange={e => setNom(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                placeholder="Ex : Marie Koffi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Téléphone</label>
              <input
                type="tel"
                value={telephone}
                onChange={e => setTelephone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
                placeholder="Ex : 07 00 00 00 00"
              />
            </div>
            <button
              type="button"
              onClick={soumettre}
              disabled={!valide || envoi}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
                valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {envoi ? 'Envoi...' : "Confirmer mon inscription à la liste d'attente"}
            </button>
            <button type="button" onClick={() => setFormulaireOuvert(false)} className="w-full text-xs text-gray-400 hover:text-[#5B7A56]">
              Annuler
            </button>
          </div>
        )}

        {succes && (
          <div className="reveal-doux">
            <div className="icone-cloture w-16 h-16 rounded-full bg-[#E7F2DE] flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-8 h-8 text-[#4F8A3D]" strokeWidth={1.7} />
            </div>
            <p className="text-sm font-semibold text-[#1B3B1A]">Vous êtes sur la liste d'attente !</p>
            <p className="text-xs text-gray-500 mt-1">L'équipe vous recontactera si une place se libère.</p>
          </div>
        )}
      </div>
    </div>
  )
}

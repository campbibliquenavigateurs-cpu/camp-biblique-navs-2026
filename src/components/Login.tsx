import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface LoginProps {
  onConnecte: () => void
}

export default function Login({ onConnecte }: LoginProps) {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [enCours, setEnCours] = useState(false)

  async function seConnecter() {
    setEnCours(true)
    setErreur('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    setEnCours(false)
    if (error) {
      setErreur('Identifiants incorrects. Merci de réessayer.')
      return
    }
    onConnecte()
  }

  const formulaireValide = email.trim() !== '' && motDePasse !== ''

  return (
    <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full border border-[#E7F2DE]">
        <h2 className="text-lg font-bold text-[#1B3B1A] mb-1">Espace comité</h2>
        <p className="text-sm text-gray-500 mb-5">Connectez-vous pour accéder à la trésorerie.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="vous@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Mot de passe</label>
            <input
              type="password"
              value={motDePasse}
              onChange={e => setMotDePasse(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
              placeholder="••••••••"
              onKeyDown={e => { if (e.key === 'Enter' && formulaireValide) seConnecter() }}
            />
          </div>

          {erreur && <p className="text-sm text-[#B3492F]">{erreur}</p>}

          <button
            type="button"
            onClick={seConnecter}
            disabled={enCours || !formulaireValide}
            className={`w-full px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors duration-200 ${
              !enCours && formulaireValide ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {enCours ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}

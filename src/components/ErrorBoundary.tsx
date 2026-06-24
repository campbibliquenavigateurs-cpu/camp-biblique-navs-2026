import { Component, type ReactNode } from 'react'
import { RefreshCw } from 'lucide-react'

// ============================================================
// Camp Biblique-Navs 2026 — Filet de sécurité général (Phase 25)
// Si une erreur survient n'importe où dans l'application (conflit
// avec une extension de navigateur, traduction automatique non
// prévue ailleurs, ou tout autre incident imprévu), cet écran de
// récupération s'affiche à la place d'une page blanche silencieuse.
// Ne remplace pas la correction d'un bug précis, mais garantit que
// l'application ne se bloque plus jamais sans aucune explication.
// ============================================================

interface Props { children: ReactNode }
interface State { aPlante: boolean }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { aPlante: false }

  static getDerivedStateFromError(): State {
    return { aPlante: true }
  }

  componentDidCatch(erreur: unknown) {
    console.error('Erreur interceptée par le filet de sécurité :', erreur)
  }

  render() {
    if (this.state.aPlante) {
      return (
        <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
            <p className="text-lg font-bold text-[#1B3B1A] mb-2">Une erreur inattendue est survenue</p>
            <p className="text-sm text-gray-500 mb-5">
              Veuillez recharger la page. Si le problème persiste, vérifiez qu'aucune traduction
              automatique du navigateur n'est activée sur cette page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530]"
            >
              <RefreshCw className="w-4 h-4" strokeWidth={1.8} />
              Recharger la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

import { Link } from 'react-router-dom'

// ============================================================
// Camp Biblique-Navs 2026 — Comment se préparer (Phase 12)
// Structure de page volontairement minimale : le contenu détaillé
// (liste à apporter, conseils pratiques...) sera rédigé directement
// par l'équipe d'organisation, pas par Claude.
// ============================================================

export default function PreparationCamp() {
  return (
    <div className="min-h-screen bg-[#F4F9F0] py-8 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B3B1A] mb-1 text-center">Comment se préparer pour le camp</h1>
        <p className="text-sm text-gray-500 text-center mb-6">Camp Biblique-Navs 2026 · 23 – 29 août 2026</p>

        <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-6">
          <p className="text-sm text-gray-400 italic text-center py-8">
            Contenu à venir — cette page sera bientôt complétée par l'équipe d'organisation
            (ce qu'il faut apporter, conseils pratiques, etc.).
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-sm text-[#5B7A56] hover:underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  )
}

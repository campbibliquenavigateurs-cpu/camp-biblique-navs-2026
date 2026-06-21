import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import PublicLayout from './components/PublicLayout'
import ComiteLayout from './components/ComiteLayout'
import Home from './components/Home'
import InscriptionForm from './components/InscriptionForm'

// ============================================================
// Camp Biblique-Navs 2026 — Routeur principal (Phase 16, performance)
// Seuls les écrans les plus probablement visités en premier
// (Accueil, Inscription, les deux layouts) sont chargés
// immédiatement. Tout le reste — en particulier les gros tableaux
// de bord de l'Espace Comité, jamais utilisés par le grand public —
// n'est téléchargé qu'au moment où on y navigue réellement
// (React.lazy + Suspense), ce qui allège nettement le chargement
// initial du site pour un visiteur public.
// ============================================================

const MonInscription = lazy(() => import('./components/MonInscription'))
const PreparationCamp = lazy(() => import('./components/PreparationCamp'))
const AnnoncesPublic = lazy(() => import('./components/AnnoncesPublic'))
const ChantsPublic = lazy(() => import('./components/ChantsPublic'))
const DocumentsPublic = lazy(() => import('./components/DocumentsPublic'))
const Temoignages = lazy(() => import('./components/Temoignages'))
const EvaluationForm = lazy(() => import('./components/EvaluationForm'))

const TresorerieDashboard = lazy(() => import('./components/TresorerieDashboard'))
const LogistiqueDashboard = lazy(() => import('./components/LogistiqueDashboard'))
const SanteDashboard = lazy(() => import('./components/SanteDashboard'))
const GestionInscriptions = lazy(() => import('./components/GestionInscriptions'))
const AdminTemoignages = lazy(() => import('./components/AdminTemoignages'))
const ContenusAdmin = lazy(() => import('./components/ContenusAdmin'))
const EvaluationStats = lazy(() => import('./components/EvaluationStats'))
const ParametresAdmin = lazy(() => import('./components/ParametresAdmin'))
const ListeAttenteAdmin = lazy(() => import('./components/ListeAttenteAdmin'))

function ChargementRoute() {
  return (
    <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
      <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Chargement...</p>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Suspense fallback={<ChargementRoute />}>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="inscription" element={<InscriptionForm />} />
              <Route path="mon-inscription" element={<MonInscription />} />
              <Route path="preparation" element={<PreparationCamp />} />
              <Route path="annonces" element={<AnnoncesPublic />} />
              <Route path="louange" element={<ChantsPublic />} />
              <Route path="ressources" element={<DocumentsPublic />} />
              <Route path="temoignages" element={<Temoignages />} />
              <Route path="evaluation" element={<EvaluationForm />} />
            </Route>
            <Route path="comite" element={<ComiteLayout />}>
              <Route path="tresorerie" element={<TresorerieDashboard />} />
              <Route path="logistique" element={<LogistiqueDashboard />} />
              <Route path="sante" element={<SanteDashboard />} />
              <Route path="inscriptions" element={<GestionInscriptions />} />
              <Route path="moderation" element={<AdminTemoignages />} />
              <Route path="contenus" element={<ContenusAdmin />} />
              <Route path="evaluations" element={<EvaluationStats />} />
              <Route path="parametres" element={<ParametresAdmin />} />
              <Route path="liste-attente" element={<ListeAttenteAdmin />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App

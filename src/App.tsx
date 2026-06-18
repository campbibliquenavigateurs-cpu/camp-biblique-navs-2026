import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ToastProvider } from './components/Toast'
import PublicLayout from './components/PublicLayout'
import ComiteLayout from './components/ComiteLayout'

// Hub public
import InscriptionForm from './components/InscriptionForm'
import AnnoncesPublic from './components/AnnoncesPublic'
import ChantsPublic from './components/ChantsPublic'
import DocumentsPublic from './components/DocumentsPublic'
import Temoignages from './components/Temoignages'
import EvaluationForm from './components/EvaluationForm'

// Espace comité
import TresorerieDashboard from './components/TresorerieDashboard'
import LogistiqueDashboard from './components/LogistiqueDashboard'
import SanteDashboard from './components/SanteDashboard'
import AdminTemoignages from './components/AdminTemoignages'
import ContenusAdmin from './components/ContenusAdmin'
import EvaluationStats from './components/EvaluationStats'
import ParametresAdmin from './components/ParametresAdmin'

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Hub public */}
          <Route element={<PublicLayout />}>
            <Route index element={<InscriptionForm />} />
            <Route path="annonces" element={<AnnoncesPublic />} />
            <Route path="louange" element={<ChantsPublic />} />
            <Route path="ressources" element={<DocumentsPublic />} />
            <Route path="temoignages" element={<Temoignages />} />
            <Route path="evaluation" element={<EvaluationForm />} />
          </Route>

          {/* Espace comité (menu dynamique selon le rôle, voir ComiteLayout.tsx) */}
          <Route path="comite" element={<ComiteLayout />}>
            <Route path="tresorerie" element={<TresorerieDashboard />} />
            <Route path="logistique" element={<LogistiqueDashboard />} />
            <Route path="sante" element={<SanteDashboard />} />
            <Route path="moderation" element={<AdminTemoignages />} />
            <Route path="contenus" element={<ContenusAdmin />} />
            <Route path="evaluations" element={<EvaluationStats />} />
            <Route path="parametres" element={<ParametresAdmin />} />
          </Route>

          {/* Toute URL inconnue renvoie vers l'accueil */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App

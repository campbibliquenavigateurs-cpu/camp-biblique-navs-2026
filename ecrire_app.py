content = """import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import PublicLayout from './components/PublicLayout'
import ComiteLayout from './components/ComiteLayout'
import Home from './components/Home'
import InscriptionForm from './components/InscriptionForm'
import AnnoncesPublic from './components/AnnoncesPublic'
import ChantsPublic from './components/ChantsPublic'
import DocumentsPublic from './components/DocumentsPublic'
import Temoignages from './components/Temoignages'
import EvaluationForm from './components/EvaluationForm'
import MonInscription from './components/MonInscription'
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
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="inscription" element={<InscriptionForm />} />
            <Route path="mon-inscription" element={<MonInscription />} />
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
            <Route path="moderation" element={<AdminTemoignages />} />
            <Route path="contenus" element={<ContenusAdmin />} />
            <Route path="evaluations" element={<EvaluationStats />} />
            <Route path="parametres" element={<ParametresAdmin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
"""

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("App.tsx ecrit avec succes !")

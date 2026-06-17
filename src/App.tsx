import AnnoncesPublic from './components/AnnoncesPublic'
import ChantsPublic from './components/ChantsPublic'
import DocumentsPublic from './components/DocumentsPublic'

function App() {
  return (
    <div>
      <div className="pt-6">
        <AnnoncesPublic />
      </div>
      <ChantsPublic />
      <DocumentsPublic />
    </div>
  )
}

export default App

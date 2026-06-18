import { useState } from 'react'
import AdminAnnonces from './AdminAnnonces'
import AdminChants from './AdminChants'
import AdminDocuments from './AdminDocuments'

// ============================================================
// Camp Biblique-Navs 2026 — Onglet "Contenus" (Phase 4, Étape A)
// Regroupe les 3 back-offices de contenus publics déjà construits
// en Phase 3 (Annonces, Chants, Documents) sous un seul onglet du
// menu, pour ne pas surcharger la liste demandée par Gimini.
// ============================================================

type Onglet = 'annonces' | 'chants' | 'documents'

const ONGLETS: { cle: Onglet; label: string }[] = [
  { cle: 'annonces', label: 'Annonces' },
  { cle: 'chants', label: 'Chants' },
  { cle: 'documents', label: 'Documents' },
]

export default function ContenusAdmin() {
  const [onglet, setOnglet] = useState<Onglet>('annonces')

  return (
    <div>
      <div className="bg-white border-b border-[#E7F2DE] px-4 pt-3 flex gap-1">
        {ONGLETS.map(o => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors duration-200 ${
              onglet === o.cle
                ? 'bg-[#F4F9F0] text-[#1B3B1A] border-b-2 border-[#4F8A3D]'
                : 'text-gray-400 hover:text-[#1B3B1A]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'annonces' && <AdminAnnonces />}
      {onglet === 'chants' && <AdminChants />}
      {onglet === 'documents' && <AdminDocuments />}
    </div>
  )
}

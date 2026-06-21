import { type ReactNode } from 'react'

// ============================================================
// Camp Biblique-Navs 2026 — Composants partagés (Phase 11)
// Extraits de TresorerieDashboard.tsx pour être réutilisés à
// l'identique dans LogistiqueDashboard.tsx (et au-delà), plutôt
// que de dupliquer ce code dans chaque écran admin.
// ============================================================

export function Modale({ titre, onFermer, children }: { titre: string; onFermer: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 h-dvh w-full z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto" onClick={onFermer}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 my-auto max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-base font-bold text-[#1B3B1A]">{titre}</p>
          <button type="button" onClick={onFermer} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function BoutonSupprimer({ id, enConfirmation, onDemanderConfirmation, onConfirmer }: {
  id: string
  enConfirmation: string | null
  onDemanderConfirmation: (id: string | null) => void
  onConfirmer: () => void
}) {
  if (enConfirmation === id) {
    return (
      <button type="button" onClick={onConfirmer} className="text-xs font-bold text-white bg-[#B3492F] px-2 py-1 rounded-md">
        Confirmer ?
      </button>
    )
  }
  return (
    <button type="button" onClick={() => onDemanderConfirmation(id)} title="Supprimer" className="text-[#B3492F] hover:text-[#8a3722]">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
      </svg>
    </button>
  )
}

export function BoutonModifier({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} title="Modifier" className="text-[#5B7A56] hover:text-[#1B3B1A]">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12.572V18.75a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75V6.75A2.25 2.25 0 015.25 4.5h6.178" />
      </svg>
    </button>
  )
}

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-3 py-3">
      <button type="button" onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}
        className={`px-3 py-1 rounded-lg text-xs font-medium ${page === 1 ? 'text-gray-300' : 'text-[#1B3B1A] hover:bg-[#E7F2DE]'}`}>
        Précédent
      </button>
      <span className="text-xs text-gray-500">Page {page} / {totalPages}</span>
      <button type="button" onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}
        className={`px-3 py-1 rounded-lg text-xs font-medium ${page === totalPages ? 'text-gray-300' : 'text-[#1B3B1A] hover:bg-[#E7F2DE]'}`}>
        Suivant
      </button>
    </div>
  )
}

export function CarteKPI({ label, valeur, accent }: { label: string; valeur: string; accent?: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold mt-1 ${accent ?? 'text-[#1B3B1A]'}`}>{valeur}</p>
    </div>
  )
}

export function paginer<T>(liste: T[], page: number, parPage: number): T[] {
  return liste.slice((page - 1) * parPage, page * parPage)
}

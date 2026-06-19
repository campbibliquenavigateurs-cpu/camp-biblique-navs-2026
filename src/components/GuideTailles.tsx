import { useState } from 'react'

// ============================================================
// Camp Biblique-Navs 2026 — Guide des tailles de polo (Phase 6)
// Mesures de référence standard (à ajuster si le fournisseur du
// camp communique ses propres mensurations exactes).
// ============================================================

const MESURES: { taille: string; epaules: number; longueur: number }[] = [
  { taille: 'XS', epaules: 42, longueur: 65 },
  { taille: 'S', epaules: 44, longueur: 68 },
  { taille: 'M', epaules: 46, longueur: 71 },
  { taille: 'L', epaules: 48, longueur: 74 },
  { taille: 'XL', epaules: 50, longueur: 77 },
  { taille: 'XXL', epaules: 52, longueur: 80 },
]

function SchemaPolo() {
  return (
    <svg viewBox="0 0 200 200" className="w-32 h-32 mx-auto" aria-hidden="true">
      <path
        d="M70 40 L60 55 L40 65 L48 90 L62 82 L62 165 L138 165 L138 82 L152 90 L160 65 L140 55 L130 40 Q115 52 100 52 Q85 52 70 40Z"
        fill="#E7F2DE" stroke="#4F8A3D" strokeWidth="2"
      />
      <path d="M100 52 L100 75" stroke="#4F8A3D" strokeWidth="1.5" />
      {/* Flèche largeur épaules */}
      <line x1="62" y1="58" x2="138" y2="58" stroke="#D9A441" strokeWidth="1.5" markerEnd="url(#fleche)" markerStart="url(#fleche)" />
      {/* Flèche longueur */}
      <line x1="172" y1="82" x2="172" y2="165" stroke="#D9A441" strokeWidth="1.5" markerEnd="url(#fleche)" markerStart="url(#fleche)" />
      <defs>
        <marker id="fleche" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#D9A441" />
        </marker>
      </defs>
      <text x="100" y="48" textAnchor="middle" fontSize="7" fill="#8A6A23">Largeur épaules</text>
      <text x="186" y="125" textAnchor="middle" fontSize="7" fill="#8A6A23" transform="rotate(90 186 125)">Longueur</text>
    </svg>
  )
}

export default function GuideTailles({ tailleSelectionnee }: { tailleSelectionnee?: string }) {
  const [ouvert, setOuvert] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[#4F8A3D] hover:underline"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
        </svg>
        Voir le guide des tailles
      </button>

      {ouvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setOuvert(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-base font-bold text-[#1B3B1A]">Guide des tailles</p>
              <button type="button" onClick={() => setOuvert(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <SchemaPolo />

            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="text-left text-gray-400 text-xs border-b border-gray-100">
                  <th className="py-1.5 font-medium">Taille</th>
                  <th className="py-1.5 font-medium">Épaules</th>
                  <th className="py-1.5 font-medium">Longueur</th>
                </tr>
              </thead>
              <tbody>
                {MESURES.map(m => (
                  <tr
                    key={m.taille}
                    className={`border-b border-gray-50 last:border-0 ${m.taille === tailleSelectionnee ? 'bg-[#E7F2DE]' : ''}`}
                  >
                    <td className="py-1.5 font-semibold text-[#1B3B1A]">{m.taille}</td>
                    <td className="py-1.5 text-gray-600">{m.epaules} cm</td>
                    <td className="py-1.5 text-gray-600">{m.longueur} cm</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-xs text-gray-400 mt-3">
              Mesures à titre indicatif. En cas de doute, choisissez la taille supérieure.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

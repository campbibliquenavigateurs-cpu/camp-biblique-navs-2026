// ============================================================
// Camp Biblique-Navs 2026 — Écrans Skeleton (Phase 16, performance)
// Remplace les "Chargement..." bruts par des silhouettes animées
// aux dimensions proches du contenu réel, pour un chargement
// visuellement plus fluide. Pur CSS (animate-pulse de Tailwind),
// aucune dépendance ajoutée.
// ============================================================

export function SkeletonLigneTableau({ colonnes = 5 }: { colonnes?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: colonnes }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3.5 rounded bg-[#E7F2DE]" style={{ width: `${60 + (i % 3) * 15}%` }} />
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTableau({ lignes = 5, colonnes = 5 }: { lignes?: number; colonnes?: number }) {
  return (
    <>
      {Array.from({ length: lignes }).map((_, i) => (
        <SkeletonLigneTableau key={i} colonnes={colonnes} />
      ))}
    </>
  )
}

export function SkeletonCarteAnnonce() {
  return (
    <div className="animate-pulse bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-16 rounded-full bg-[#E7F2DE]" />
        <div className="h-3 w-12 rounded bg-[#E7F2DE]" />
      </div>
      <div className="h-4 w-3/4 rounded bg-[#E7F2DE] mb-2" />
      <div className="h-3 w-full rounded bg-[#E7F2DE] mb-1.5" />
      <div className="h-3 w-2/3 rounded bg-[#E7F2DE]" />
    </div>
  )
}

export function SkeletonCarteKPI() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-[#E7F2DE] shadow-sm p-4">
      <div className="h-3 w-20 rounded bg-[#E7F2DE] mb-2.5" />
      <div className="h-5 w-16 rounded bg-[#E7F2DE]" />
    </div>
  )
}

export function SkeletonCarteDossier() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-[#E7F2DE] shadow-sm p-5 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-xl bg-[#E7F2DE] mb-3" />
      <div className="h-4 w-2/3 rounded bg-[#E7F2DE] mb-1.5" />
      <div className="h-3 w-1/3 rounded bg-[#E7F2DE]" />
    </div>
  )
}

export function SkeletonTemoignage() {
  return (
    <div className="animate-pulse bg-white rounded-2xl shadow-sm p-5">
      <div className="h-3 w-5/6 rounded bg-[#E7F2DE] mb-2" />
      <div className="h-3 w-full rounded bg-[#E7F2DE] mb-2" />
      <div className="h-3 w-2/3 rounded bg-[#E7F2DE] mb-4" />
      <div className="flex items-center justify-between">
        <div className="h-3 w-1/3 rounded bg-[#E7F2DE]" />
        <div className="h-5 w-8 rounded-full bg-[#E7F2DE]" />
      </div>
    </div>
  )
}

export function SkeletonLecteurAudio() {
  return (
    <div className="animate-pulse min-h-screen bg-[#F4F9F0]">
      <div className="fixed top-4 inset-x-4 z-20 flex items-center justify-between max-w-lg mx-auto">
        <div className="h-8 w-20 rounded-full bg-[#E7F2DE]" />
        <div className="h-8 w-8 rounded-full bg-[#E7F2DE]" />
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen px-6 pt-24 pb-44 max-w-lg mx-auto space-y-3">
        <div className="h-3 w-1/3 rounded bg-[#E7F2DE] mb-3" />
        <div className="h-4 w-full rounded bg-[#E7F2DE]" />
        <div className="h-4 w-5/6 rounded bg-[#E7F2DE]" />
        <div className="h-4 w-full rounded bg-[#E7F2DE]" />
        <div className="h-4 w-2/3 rounded bg-[#E7F2DE]" />
      </div>
      <div className="fixed inset-x-4 bottom-20 sm:bottom-6 z-30 max-w-lg mx-auto">
        <div className="rounded-2xl bg-white px-5 py-4 space-y-3">
          <div className="h-3 w-1/2 rounded bg-[#E7F2DE]" />
          <div className="flex justify-center"><div className="w-14 h-14 rounded-full bg-[#E7F2DE]" /></div>
          <div className="h-1.5 w-full rounded-full bg-[#E7F2DE]" />
        </div>
      </div>
    </div>
  )
}

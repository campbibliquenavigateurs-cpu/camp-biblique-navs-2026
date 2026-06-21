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
    <div className="animate-pulse bg-white rounded-2xl shadow-sm">
      <div className="p-5 border-b border-[#E7F2DE] flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-[#E7F2DE] shrink-0" />
        <div className="flex-1 h-1.5 rounded-full bg-[#E7F2DE]" />
        <div className="w-16 h-1.5 rounded-full bg-[#E7F2DE] shrink-0" />
      </div>
      <div className="p-5 space-y-2.5">
        <div className="h-4 w-1/2 rounded bg-[#E7F2DE] mb-3" />
        <div className="h-3 w-full rounded bg-[#E7F2DE]" />
        <div className="h-3 w-5/6 rounded bg-[#E7F2DE]" />
        <div className="h-3 w-full rounded bg-[#E7F2DE]" />
        <div className="h-3 w-2/3 rounded bg-[#E7F2DE]" />
      </div>
    </div>
  )
}

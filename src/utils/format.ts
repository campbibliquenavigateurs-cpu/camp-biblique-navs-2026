// ============================================================
// Camp Biblique-Navs 2026 — Utilitaires de formatage (Phase 8)
// ============================================================
// Correctif : toLocaleString('fr-FR') insère par défaut une espace
// fine insécable (caractère U+202F), qui s'affiche comme un trait
// ou un slash sur certaines polices Android. On formate donc les
// montants manuellement avec une espace standard, pour garantir un
// rendu identique sur tous les appareils.

export function formatFCFA(montant: number | null | undefined): string {
  const entier = Math.round(montant ?? 0)
  const partieAbsolue = Math.abs(entier).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return (entier < 0 ? '-' : '') + partieAbsolue + ' F CFA'
}

export function formatDateFr(date: string | Date | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR')
}

export function formatTailleOctets(octets: number | null | undefined): string {
  if (!octets || octets <= 0) return '—'
  if (octets < 1024) return `${octets} o`
  const ko = octets / 1024
  if (ko < 1024) return `${ko.toFixed(1)} Ko`
  const mo = ko / 1024
  if (mo < 1024) return `${mo.toFixed(1)} Mo`
  return `${(mo / 1024).toFixed(1)} Go`
}

export function formatDureeAudio(secondes: number): string {
  if (!Number.isFinite(secondes) || secondes < 0) return '0:00'
  const m = Math.floor(secondes / 60)
  const s = Math.floor(secondes % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Uniformise la casse d'un nom ou prénom (Première Lettre En
// Majuscule, reste en minuscule), quelle que soit la façon dont la
// personne l'a saisi à l'inscription (TOUT MAJUSCULE, tout minuscule,
// mélange...). Respecte les noms composés avec tiret ou apostrophe,
// fréquents localement (ex : "n'guessan jean-marie" -> "N'Guessan Jean-Marie").
export function formatNomCasse(texte: string | null | undefined): string {
  if (!texte) return ''
  return texte
    .trim()
    .toLowerCase()
    .split(' ')
    .map(mot =>
      mot
        .split(/([-'])/)
        .map(partie => (partie === '-' || partie === "'" ? partie : partie.charAt(0).toUpperCase() + partie.slice(1)))
        .join('')
    )
    .join(' ')
}

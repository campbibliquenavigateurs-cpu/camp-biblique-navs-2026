import { LayoutGrid, Utensils, Package, Heart, type LucideIcon } from 'lucide-react'

// ============================================================
// Camp Biblique-Navs 2026 — Constantes Annonces (Phase 24)
// Mappage catégorie -> icône Lucide, partagé public/admin.
// ============================================================

export const CATEGORIES_ANNONCE: { nom: string; Icone: LucideIcon }[] = [
  { nom: 'Général', Icone: LayoutGrid },
  { nom: 'Restauration', Icone: Utensils },
  { nom: 'Logistique', Icone: Package },
  { nom: 'Spirituel', Icone: Heart },
]

export function iconeDeCategorieAnnonce(categorie: string): LucideIcon {
  return CATEGORIES_ANNONCE.find(c => c.nom === categorie)?.Icone ?? LayoutGrid
}

export const NIVEAUX_GRAVITE: { valeur: 'low' | 'medium' | 'high'; label: string }[] = [
  { valeur: 'low', label: 'Normal' },
  { valeur: 'medium', label: 'Important' },
  { valeur: 'high', label: 'Urgent' },
]

export function libelleGravite(valeur: string): string {
  return NIVEAUX_GRAVITE.find(n => n.valeur === valeur)?.label ?? valeur
}

export const DUREES_EXPIRATION: { valeur: string; label: string }[] = [
  { valeur: 'aucune', label: 'Aucune expiration' },
  { valeur: '1h', label: '1 heure' },
  { valeur: '3h', label: '3 heures' },
  { valeur: '12h', label: '12 heures' },
  { valeur: 'jour', label: "Fin de journée" },
]

export function calculerDateExpiration(duree: string): string | null {
  const maintenant = new Date()
  if (duree === '1h') return new Date(maintenant.getTime() + 60 * 60 * 1000).toISOString()
  if (duree === '3h') return new Date(maintenant.getTime() + 3 * 60 * 60 * 1000).toISOString()
  if (duree === '12h') return new Date(maintenant.getTime() + 12 * 60 * 60 * 1000).toISOString()
  if (duree === 'jour') {
    const finJour = new Date(maintenant)
    finJour.setHours(23, 59, 59, 999)
    return finJour.toISOString()
  }
  return null
}

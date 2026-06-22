import {
  Music, Heart, Flame, BookOpen, BookOpenCheck, Users, Sparkles, MapPin,
  Award, PartyPopper, Network, Trophy, Coffee, Sparkle, Utensils, Bed, LogOut,
  type LucideIcon,
} from 'lucide-react'

// ============================================================
// Camp Biblique-Navs 2026 — Constantes du Programme (Phase 23)
// Mappage strict catégorie -> icône Lucide, partagé entre l'écran
// public et l'écran admin, pour ne jamais désynchroniser les deux.
// ============================================================

export const JOURS_CAMP: { date: string; label: string }[] = [
  { date: '2026-08-23', label: 'Dimanche 23' },
  { date: '2026-08-24', label: 'Lundi 24' },
  { date: '2026-08-25', label: 'Mardi 25' },
  { date: '2026-08-26', label: 'Mercredi 26' },
  { date: '2026-08-27', label: 'Jeudi 27' },
  { date: '2026-08-28', label: 'Vendredi 28' },
  { date: '2026-08-29', label: 'Samedi 29' },
]

export const CATEGORIES_PROGRAMME: { nom: string; Icone: LucideIcon }[] = [
  { nom: 'Adoration & Louange', Icone: Music },
  { nom: 'Méditations', Icone: Heart },
  { nom: 'Temps seul avec Dieu', Icone: Flame },
  { nom: 'Message / Prédication', Icone: BookOpen },
  { nom: 'Études Bibliques', Icone: BookOpenCheck },
  { nom: 'Ateliers simultanés', Icone: Users },
  { nom: 'Prière d\'ensemble', Icone: Sparkles },
  { nom: 'Arrivée & Inscriptions', Icone: MapPin },
  { nom: 'Cérémonies & Présentations', Icone: Award },
  { nom: 'Soirées Récréatives', Icone: PartyPopper },
  { nom: 'Temps en équipe / Zones', Icone: Network },
  { nom: 'Sports et Loisirs', Icone: Trophy },
  { nom: 'Pauses', Icone: Coffee },
  { nom: 'Toilette / Nettoyage', Icone: Sparkle },
  { nom: 'Repas & Ruptures de jeûne', Icone: Utensils },
  { nom: 'Dortoir', Icone: Bed },
  { nom: 'Départ', Icone: LogOut },
]

export function iconeDeCategorie(categorie: string): LucideIcon {
  return CATEGORIES_PROGRAMME.find(c => c.nom === categorie)?.Icone ?? Music
}

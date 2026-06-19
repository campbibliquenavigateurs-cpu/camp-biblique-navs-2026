import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  Wallet,
  Package,
  HeartPulse,
  ShieldCheck,
  FileText,
  BarChart3,
  Settings,
  ClipboardList,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAccesRole } from '../hooks/useAccesRole'
import Login from './Login'
import TransitionPage from './TransitionPage'

// ============================================================
// Camp Biblique-Navs 2026 — Espace comité (Phase 4, Étape A)
// Sidebar sur ordinateur, menu bas sur smartphone.
// Le menu affiché dépend dynamiquement du rôle de la personne connectée.
// ============================================================

const ROLES_COMITE = ['admin', 'comite_treso', 'comite_logistique', 'comite_sante'] as const

interface ItemMenu {
  label: string
  path: string
}

// "Contenus" (Annonces/Chants/Documents), "Évaluations" et "Paramètres" ont
// été ajoutés à la liste demandée par Gimini pour ne pas rendre inaccessibles
// des écrans déjà développés en Phase 3.
const MENU_PAR_ROLE: Record<string, ItemMenu[]> = {
  admin: [
    { label: 'Trésorerie', path: 'tresorerie' },
    { label: 'Inscriptions', path: 'inscriptions' },
    { label: 'Logistique', path: 'logistique' },
    { label: 'Contenus', path: 'contenus' },
    { label: 'Santé', path: 'sante' },
    { label: 'Modération', path: 'moderation' },
    { label: 'Évaluations', path: 'evaluations' },
    { label: 'Paramètres', path: 'parametres' },
  ],
  comite_treso: [{ label: 'Trésorerie', path: 'tresorerie' }],
  comite_logistique: [{ label: 'Logistique', path: 'logistique' }],
  comite_sante: [{ label: 'Santé', path: 'sante' }],
}

// Sur smartphone, seuls les 4 onglets jugés prioritaires restent visibles
// directement dans le menu bas ; les autres sont regroupés sous "Plus"
// (même motif que le Hub public). La barre latérale, elle, affiche tout.
const ONGLETS_PRIORITAIRES = ['tresorerie', 'inscriptions', 'logistique', 'contenus']

function diviserMenuMobile(menu: ItemMenu[]) {
  if (menu.length <= 4) return { principaux: menu, secondaires: [] as ItemMenu[] }
  const principaux = ONGLETS_PRIORITAIRES
    .map(chemin => menu.find(item => item.path === chemin))
    .filter((item): item is ItemMenu => !!item)
  const secondaires = menu.filter(item => !ONGLETS_PRIORITAIRES.includes(item.path))
  return { principaux, secondaires }
}

const ICONES_PAR_CHEMIN: Record<string, LucideIcon> = {
  tresorerie: Wallet,
  logistique: Package,
  sante: HeartPulse,
  inscriptions: ClipboardList,
  moderation: ShieldCheck,
  contenus: FileText,
  evaluations: BarChart3,
  parametres: Settings,
}

export default function ComiteLayout() {
  const { statutAcces, role, nomComplet, verifierAcces } = useAccesRole(ROLES_COMITE)
  const location = useLocation()
  const [plusOuvert, setPlusOuvert] = useState(false)

  if (statutAcces === 'verification') {
    return (
      <div className="min-h-screen bg-[#F4F9F0] flex items-center justify-center">
        <p className="text-[#5B7A56] text-sm font-medium animate-pulse">Vérification des accès...</p>
      </div>
    )
  }

  if (statutAcces === 'non_connecte') {
    return <Login onConnecte={verifierAcces} />
  }

  if (statutAcces === 'refuse') {
    return (
      <Navigate
        to="/"
        replace
        state={{ messageAcces: "Cet espace est réservé à l'équipe d'organisation du camp." }}
      />
    )
  }

  const menu = MENU_PAR_ROLE[role ?? ''] ?? []
  const { principaux, secondaires } = diviserMenuMobile(menu)

  // Page d'accueil de l'espace comité : redirige vers le premier onglet autorisé.
  if ((location.pathname === '/comite' || location.pathname === '/comite/') && menu.length > 0) {
    return <Navigate to={`/comite/${menu[0].path}`} replace />
  }

  async function seDeconnecter() {
    await supabase.auth.signOut()
    verifierAcces()
  }

  return (
    <div className="min-h-screen bg-[#F4F9F0] flex flex-col md:flex-row">
      {/* Sidebar — ordinateur */}
      <aside className="hidden md:flex md:flex-col md:w-60 bg-[#1B3B1A] text-white shrink-0">
        <div className="p-5 border-b border-white/10">
          <p className="font-bold leading-tight">Camp Biblique-Navs</p>
          <p className="text-xs text-white/50 mt-0.5">Espace comité</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {menu.map(item => {
            const Icon = ICONES_PAR_CHEMIN[item.path]
            return (
              <NavLink
                key={item.path}
                to={`/comite/${item.path}`}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive ? 'bg-[#4F8A3D] text-white' : 'text-white/80 hover:bg-white/10'
                  }`
                }
              >
                <Icon className="w-4 h-4" strokeWidth={1.7} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          {nomComplet && <p className="text-xs text-white/50 mb-2 truncate">{nomComplet}</p>}
          <button type="button" onClick={seDeconnecter} className="text-sm text-white/70 hover:text-white">
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* En-tête + contenu */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-[#E7F2DE]">
          <p className="font-bold text-[#1B3B1A] text-sm">Espace comité</p>
          <button type="button" onClick={seDeconnecter} className="text-xs text-[#5B7A56] hover:underline">
            Se déconnecter
          </button>
        </header>

        <main className="flex-1 pb-16 md:pb-0">
          <TransitionPage>
            <Outlet />
          </TransitionPage>
        </main>

        {/* Menu bas — smartphone */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E7F2DE] z-20">
          {plusOuvert && secondaires.length > 0 && (
            <div className="absolute bottom-full inset-x-0 bg-white border-t border-[#E7F2DE] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] grid grid-cols-2">
              {secondaires.map(item => {
                const Icon = ICONES_PAR_CHEMIN[item.path]
                return (
                  <NavLink
                    key={item.path}
                    to={`/comite/${item.path}`}
                    onClick={() => setPlusOuvert(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-3 text-sm font-medium ${
                        isActive ? 'text-[#1B3B1A] bg-[#F4F9F0]' : 'text-gray-500'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.7} />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          )}
          <div className="flex">
            {principaux.map(item => {
              const Icon = ICONES_PAR_CHEMIN[item.path]
              return (
                <NavLink
                  key={item.path}
                  to={`/comite/${item.path}`}
                  onClick={() => setPlusOuvert(false)}
                  className={({ isActive }) =>
                    `flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors duration-200 ${
                      isActive ? 'text-[#4F8A3D]' : 'text-gray-400'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" strokeWidth={1.7} />
                  {item.label}
                </NavLink>
              )
            })}
            {secondaires.length > 0 && (
              <button
                type="button"
                onClick={() => setPlusOuvert(v => !v)}
                className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors duration-200 ${
                  plusOuvert ? 'text-[#4F8A3D]' : 'text-gray-400'
                }`}
              >
                <MoreHorizontal className="w-5 h-5" strokeWidth={1.7} />
                Plus
              </button>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}

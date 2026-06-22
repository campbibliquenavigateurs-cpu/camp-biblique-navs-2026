import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Home, Megaphone, Music2, FolderOpen, MessageSquareHeart, Star, MoreHorizontal, UserCheck, CalendarDays, type LucideIcon } from 'lucide-react'
import TransitionPage from './TransitionPage'

interface Lien { label: string; path: string; Icon: LucideIcon }

const LIENS_PRINCIPAUX: Lien[] = [
  { label: 'Accueil', path: '/', Icon: Home },
  { label: 'Annonces', path: '/annonces', Icon: Megaphone },
  { label: 'Louange', path: '/louange', Icon: Music2 },
  { label: 'Ressources', path: '/ressources', Icon: FolderOpen },
]

const LIENS_SECONDAIRES: Lien[] = [
  { label: 'Programme', path: '/programme', Icon: CalendarDays },
  { label: 'Témoignages', path: '/temoignages', Icon: MessageSquareHeart },
  { label: 'Évaluation', path: '/evaluation', Icon: Star },
  { label: 'Mon inscription', path: '/mon-inscription', Icon: UserCheck },
]

const classeLien = (actif: boolean) =>
  `px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-1.5 ${actif ? 'bg-[#E7F2DE] text-[#1B3B1A]' : 'text-gray-500 hover:text-[#1B3B1A]'}`

export default function PublicLayout() {
  const location = useLocation()
  const [plusOuvert, setPlusOuvert] = useState(false)
  const messageAcces = (location.state as { messageAcces?: string } | null)?.messageAcces
  const [messageVisible, setMessageVisible] = useState(!!messageAcces)

  return (
    <div className="min-h-screen bg-[#F4F9F0]">
      {messageVisible && messageAcces && (
        <div className="bg-[#D9A441]/15 border-b border-[#D9A441] px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-sm text-[#8A6A23]">{messageAcces}</p>
          <button type="button" onClick={() => setMessageVisible(false)} className="text-[#8A6A23] text-sm font-semibold shrink-0">✕</button>
        </div>
      )}

      {/* Nav desktop */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-white border-b border-[#E7F2DE]">
        <Link to="/" className="font-bold text-[#1B3B1A]">Camp Biblique-Navs 2026</Link>
        <nav className="flex gap-1">
          {[...LIENS_PRINCIPAUX, ...LIENS_SECONDAIRES].map(lien => (
            <NavLink key={lien.path} to={lien.path} end={lien.path==='/'} className={({ isActive }) => classeLien(isActive)}>
              <lien.Icon className="w-4 h-4" strokeWidth={1.7} />{lien.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="pb-20 md:pb-0">
        <TransitionPage><Outlet /></TransitionPage>
      </main>

      {/* Nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E7F2DE] z-20">
        {plusOuvert && (
          <div className="absolute bottom-full inset-x-0 bg-white border-t border-[#E7F2DE] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            {LIENS_SECONDAIRES.map(lien => (
              <NavLink key={lien.path} to={lien.path} onClick={() => setPlusOuvert(false)}
                className={({ isActive }) => `flex items-center gap-2 px-5 py-3 text-sm font-medium ${isActive ? 'text-[#1B3B1A] bg-[#F4F9F0]' : 'text-gray-500'}`}>
                <lien.Icon className="w-4 h-4" strokeWidth={1.7} />{lien.label}
              </NavLink>
            ))}
          </div>
        )}
        <div className="flex">
          {LIENS_PRINCIPAUX.map(lien => (
            <NavLink key={lien.path} to={lien.path} end={lien.path==='/'} onClick={() => setPlusOuvert(false)}
              className={({ isActive }) => `flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors duration-200 ${isActive ? 'text-[#4F8A3D]' : 'text-gray-400'}`}>
              <lien.Icon className="w-5 h-5" strokeWidth={1.7} />{lien.label}
            </NavLink>
          ))}
          <button type="button" onClick={() => setPlusOuvert(v => !v)}
            className={`flex-1 py-2.5 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors duration-200 ${plusOuvert ? 'text-[#4F8A3D]' : 'text-gray-400'}`}>
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.7} />Plus
          </button>
        </div>
      </nav>
    </div>
  )
}

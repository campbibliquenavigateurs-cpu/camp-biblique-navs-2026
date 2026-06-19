// ============================================================
// Camp Biblique-Navs 2026 — Bloc contacts officiels (Phase 6)
// Réutilisé sur la page d'accueil et l'espace campeur.
// ============================================================

interface Contact {
  role: string
  nom: string
  telAffiche: string
  telLien: string
  note?: string
}

const CONTACTS: Contact[] = [
  { role: 'Paiements & Trésorerie', nom: 'Mme Obodji', telAffiche: '07 09 62 62 65', telLien: '+2250709626265', note: 'Wave et Orange Money possibles' },
  { role: 'Sous-direction (autres informations)', nom: 'Sylvain Obodji', telAffiche: '07 09 41 62 62', telLien: '+2250709416262' },
  { role: 'Administrateur', nom: 'Haba Florent', telAffiche: '07 89 54 06 16', telLien: '+2250789540616' },
  { role: 'Administrateur', nom: 'Lobognon Tacka', telAffiche: '07 89 58 83 15', telLien: '+2250789588315' },
]

export default function ContactsOfficiels() {
  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm overflow-hidden">
      <div className="bg-[#1B3B1A] px-5 py-3">
        <p className="text-white text-sm font-bold">Besoin d'aide ? Contactez l'organisation</p>
      </div>
      <div className="divide-y divide-[#E7F2DE]">
        {CONTACTS.map(c => (
          <a
            key={c.nom}
            href={`tel:${c.telLien}`}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F4F9F0] transition-colors duration-150"
          >
            <div>
              <p className="text-sm font-semibold text-[#1B3B1A]">{c.nom}</p>
              <p className="text-xs text-gray-500">{c.role}{c.note ? ` · ${c.note}` : ''}</p>
            </div>
            <span className="text-sm font-bold text-[#4F8A3D] shrink-0 ml-3">{c.telAffiche}</span>
          </a>
        ))}
      </div>
    </div>
  )
}

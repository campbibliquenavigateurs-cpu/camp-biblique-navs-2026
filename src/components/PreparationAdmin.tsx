import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'
import { Modale, BoutonSupprimer, BoutonModifier } from './ComposantsTableau'

// ============================================================
// Camp Biblique-Navs 2026 — Gestion du contenu "Comment se préparer"
// (Phase 14). Deux sections gérées depuis un seul écran : la
// checklist à cocher et le règlement à lire — toutes deux stockées
// dans la même table, distinguées par leur "section".
// Intégré comme 4e onglet de ContenusAdmin.tsx.
// ============================================================

type Section = 'checklist' | 'reglement'

interface Item {
  id: string
  section: Section
  libelle: string
  ordre: number
}

function ModaleItem({ section, donnee, onFermer, onSauvegarde }: {
  section: Section
  donnee: Item | null
  onFermer: () => void
  onSauvegarde: () => void
}) {
  const toast = useToast()
  const [libelle, setLibelle] = useState(donnee?.libelle ?? '')
  const [envoi, setEnvoi] = useState(false)
  const valide = libelle.trim() !== ''

  async function soumettre() {
    if (!valide) return
    setEnvoi(true)
    const { error } = donnee
      ? await supabase.from('contenu_preparation').update({ libelle: libelle.trim() }).eq('id', donnee.id)
      : await supabase.from('contenu_preparation').insert({ section, libelle: libelle.trim(), ordre: 999 })
    setEnvoi(false)
    if (error) { toast.erreur("Erreur lors de l'enregistrement."); return }
    toast.succes(donnee ? 'Élément mis à jour !' : 'Élément ajouté !')
    onSauvegarde()
    onFermer()
  }

  return (
    <Modale titre={donnee ? "Modifier l'élément" : `Ajouter — ${section === 'checklist' ? 'Checklist' : 'Règlement'}`} onFermer={onFermer}>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-[#1B3B1A] mb-1">Texte</label>
          <textarea
            value={libelle}
            onChange={e => setLibelle(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#4F8A3D] focus:border-transparent"
            placeholder={section === 'checklist' ? 'Ex : Une Bible' : 'Ex : Respecter les horaires des activités'}
          />
        </div>
        <button type="button" onClick={soumettre} disabled={!valide || envoi}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold text-white ${valide && !envoi ? 'bg-[#4F8A3D] hover:bg-[#3F7530]' : 'bg-gray-300 cursor-not-allowed'}`}>
          {envoi ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </Modale>
  )
}

function ListeSection({ titre, section, items, onMaj }: {
  titre: string
  section: Section
  items: Item[]
  onMaj: () => void
}) {
  const toast = useToast()
  const [modale, setModale] = useState<Item | 'nouveau' | null>(null)
  const [confirmationId, setConfirmationId] = useState<string | null>(null)

  async function deplacer(item: Item, direction: 'haut' | 'bas') {
    const triees = [...items].sort((a, b) => a.ordre - b.ordre)
    const idx = triees.findIndex(i => i.id === item.id)
    const voisinIdx = direction === 'haut' ? idx - 1 : idx + 1
    if (voisinIdx < 0 || voisinIdx >= triees.length) return
    const voisin = triees[voisinIdx]
    await Promise.all([
      supabase.from('contenu_preparation').update({ ordre: voisin.ordre }).eq('id', item.id),
      supabase.from('contenu_preparation').update({ ordre: item.ordre }).eq('id', voisin.id),
    ])
    onMaj()
  }

  async function supprimer(id: string) {
    setConfirmationId(null)
    const { error } = await supabase.from('contenu_preparation').delete().eq('id', id)
    if (error) { toast.erreur('Erreur lors de la suppression.'); return }
    toast.succes('Supprimé avec succès.')
    onMaj()
  }

  const triees = [...items].sort((a, b) => a.ordre - b.ordre)

  return (
    <div className="bg-white rounded-2xl border border-[#E7F2DE] shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E7F2DE]">
        <p className="text-sm font-bold text-[#1B3B1A]">{titre}</p>
        <button type="button" onClick={() => setModale('nouveau')} className="text-xs font-semibold text-white bg-[#4F8A3D] hover:bg-[#3F7530] px-3 py-1.5 rounded-lg">
          + Ajouter
        </button>
      </div>
      <div className="divide-y divide-[#E7F2DE]">
        {triees.length === 0 ? (
          <p className="px-5 py-4 text-sm text-gray-400">Aucun élément pour le moment.</p>
        ) : triees.map((item, idx) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex flex-col">
              <button type="button" onClick={() => deplacer(item, 'haut')} disabled={idx === 0} className={`text-xs ${idx === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-[#1B3B1A]'}`}>▲</button>
              <button type="button" onClick={() => deplacer(item, 'bas')} disabled={idx === triees.length - 1} className={`text-xs ${idx === triees.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-[#1B3B1A]'}`}>▼</button>
            </div>
            <p className="flex-1 text-sm text-[#1B3B1A]">{item.libelle}</p>
            <div className="flex items-center gap-2.5">
              <BoutonModifier onClick={() => setModale(item)} />
              <BoutonSupprimer id={item.id} enConfirmation={confirmationId} onDemanderConfirmation={setConfirmationId} onConfirmer={() => supprimer(item.id)} />
            </div>
          </div>
        ))}
      </div>

      {modale && (
        <ModaleItem
          section={section}
          donnee={modale === 'nouveau' ? null : modale}
          onFermer={() => setModale(null)}
          onSauvegarde={onMaj}
        />
      )}
    </div>
  )
}

export default function PreparationAdmin() {
  const [items, setItems] = useState<Item[]>([])
  const [chargement, setChargement] = useState(true)

  const charger = useCallback(async () => {
    setChargement(true)
    const { data, error } = await supabase.from('contenu_preparation').select('*').order('ordre')
    if (!error && data) setItems(data as Item[])
    setChargement(false)
  }, [])

  useEffect(() => { charger() }, [charger])

  const checklist = items.filter(i => i.section === 'checklist')
  const reglement = items.filter(i => i.section === 'reglement')

  return (
    <div className="px-4 py-6 space-y-4 bg-[#F4F9F0]">
      <p className="text-sm text-gray-500">
        Ce contenu alimente directement la page publique « Comment se préparer pour le camp ».
      </p>
      {chargement ? (
        <p className="text-sm text-gray-400">Chargement...</p>
      ) : (
        <>
          <ListeSection titre="Checklist (à cocher)" section="checklist" items={checklist} onMaj={charger} />
          <ListeSection titre="Règlement du camp (à lire)" section="reglement" items={reglement} onMaj={charger} />
        </>
      )}
    </div>
  )
}

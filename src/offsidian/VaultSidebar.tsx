import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileText,
  Folder,
  FolderOpen,
  Home,
  Search,
  Star,
  Wrench,
  X,
} from 'lucide-react'
import type { OpenNote, VaultGroup, VaultManifest, VaultNote } from './types'
import { normalizeSearch, shortTitle } from './utils'

const GROUPS: VaultGroup[] = ['Guides', 'Techniques', 'Outils', 'Templates']

const groupIcon = (group: VaultGroup, open = false) => {
  if (group === 'Outils') return Wrench
  if (group === 'Techniques') return FileCode2
  if (group === 'Guides') return BookOpen
  return open ? FolderOpen : Folder
}

function NoteRow({
  note,
  active,
  favorite,
  onOpen,
}: {
  note: VaultNote
  active: boolean
  favorite?: boolean
  onOpen: () => void
}) {
  const Icon = note.group === 'Outils' ? Wrench : note.group === 'Techniques' ? FileCode2 : FileText
  return (
    <button
      type="button"
      className={`offsidian-file ${active ? 'is-active' : ''}`}
      onClick={onOpen}
      title={note.title}
      aria-current={active ? 'page' : undefined}
    >
      <Icon aria-hidden="true" />
      <span>{shortTitle(note)}</span>
      {favorite ? <Star className="offsidian-file-star" aria-label="Favori" /> : null}
      {note.status === 'brouillon' ? <i title="Brouillon" aria-label="Brouillon" /> : null}
    </button>
  )
}

type VaultSidebarProps = {
  manifest: VaultManifest
  selected: VaultNote
  favorites: string[]
  recent: string[]
  mobileOpen: boolean
  onCloseMobile: () => void
  onOpenNote: OpenNote
  onOpenSearch: () => void
}

function VaultSidebar({
  manifest,
  selected,
  favorites,
  recent,
  mobileOpen,
  onCloseMobile,
  onOpenNote,
  onOpenSearch,
}: VaultSidebarProps) {
  const [filter, setFilter] = useState('')
  /* La saisie reste prioritaire sur le filtrage des 344 fichiers. */
  const deferredFilter = useDeferredValue(filter)
  const [openGroups, setOpenGroups] = useState<Set<VaultGroup>>(
    () => new Set<VaultGroup>(['Guides', selected.group]),
  )

  const noteById = useMemo(() => new Map(manifest.notes.map((note) => [note.id, note])), [manifest.notes])
  /* Normaliser 344 titres à chaque frappe coûte plus cher que le filtrage
     lui-même : on le fait une fois par manifeste. */
  const haystackById = useMemo(
    () =>
      new Map(
        manifest.notes.map((note) => [note.id, normalizeSearch(`${note.title} ${note.category} ${note.tags.join(' ')}`)]),
      ),
    [manifest.notes],
  )
  const normalizedFilter = normalizeSearch(deferredFilter)

  useEffect(() => {
    setOpenGroups((current) => new Set([...current, selected.group]))
  }, [selected.group])

  const visibleByGroup = useMemo(() => {
    const result = new Map<VaultGroup, VaultNote[]>()
    for (const group of GROUPS) {
      const notes = manifest.notes.filter((note) => {
        if (note.group !== group) return false
        if (!normalizedFilter) return true
        return (haystackById.get(note.id) ?? '').includes(normalizedFilter)
      })
      result.set(group, notes)
    }
    return result
  }, [haystackById, manifest.notes, normalizedFilter])

  const favoriteNotes = favorites.flatMap((id) => (noteById.has(id) ? [noteById.get(id)!] : []))
  const recentNotes = recent
    .filter((id) => id !== selected.id)
    .slice(0, 4)
    .flatMap((id) => (noteById.has(id) ? [noteById.get(id)!] : []))

  const open = (note: VaultNote) => {
    onOpenNote(note.id)
    onCloseMobile()
  }

  const toggleGroup = (group: VaultGroup) => {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <>
      <button
        type="button"
        className={`offsidian-sidebar-scrim ${mobileOpen ? 'is-open' : ''}`}
        onClick={onCloseMobile}
        aria-label="Fermer l’explorateur"
      />
      <aside className={`offsidian-sidebar ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Explorateur du vault">
        <div className="offsidian-pane-title">
          <span>Explorateur</span>
          <button type="button" onClick={onCloseMobile} className="offsidian-icon-btn offsidian-mobile-only" aria-label="Fermer">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="offsidian-sidebar-search">
          <Search aria-hidden="true" />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtrer les fichiers…"
            aria-label="Filtrer les fichiers"
          />
          {filter ? (
            <button type="button" onClick={() => setFilter('')} aria-label="Effacer le filtre">
              <X aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="offsidian-tree" data-testid="vault-tree">
          {!normalizedFilter ? (
            <>
              <div className="offsidian-tree-section">
                <p className="offsidian-tree-label">Accès rapide</p>
                <NoteRow
                  note={noteById.get('sommaire')!}
                  active={selected.id === 'sommaire'}
                  favorite={favorites.includes('sommaire')}
                  onOpen={() => open(noteById.get('sommaire')!)}
                />
                <button
                  type="button"
                  className={`offsidian-file ${selected.id === 'index' ? 'is-active' : ''}`}
                  onClick={() => open(noteById.get('index')!)}
                >
                  <Home aria-hidden="true" />
                  <span>Index du vault</span>
                </button>
              </div>

              {favoriteNotes.length ? (
                <div className="offsidian-tree-section">
                  <p className="offsidian-tree-label">
                    <Star aria-hidden="true" /> Favoris
                  </p>
                  {favoriteNotes.map((note) => (
                    <NoteRow key={note.id} note={note} active={selected.id === note.id} favorite onOpen={() => open(note)} />
                  ))}
                </div>
              ) : null}

              {recentNotes.length ? (
                <div className="offsidian-tree-section">
                  <p className="offsidian-tree-label">Récents</p>
                  {recentNotes.map((note) => (
                    <NoteRow
                      key={note.id}
                      note={note}
                      active={selected.id === note.id}
                      favorite={favorites.includes(note.id)}
                      onOpen={() => open(note)}
                    />
                  ))}
                </div>
              ) : null}
            </>
          ) : null}

          <div className="offsidian-vault-root">
            <div className="offsidian-vault-root-label">
              <span className="offsidian-vault-glyph" aria-hidden="true">◇</span>
              <strong>OFFSIDIAN</strong>
              <span>{manifest.stats.notes}</span>
            </div>

            {GROUPS.map((group) => {
              const notes = visibleByGroup.get(group) ?? []
              const expanded = normalizedFilter ? notes.length > 0 : openGroups.has(group)
              const Icon = groupIcon(group, expanded)
              if (normalizedFilter && !notes.length) return null
              return (
                <section key={group} className="offsidian-folder">
                  <button
                    type="button"
                    className="offsidian-folder-button"
                    onClick={() => toggleGroup(group)}
                    aria-expanded={expanded}
                  >
                    {expanded ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                    <Icon aria-hidden="true" />
                    <span>{group}</span>
                    <small>{notes.length}</small>
                  </button>
                  {expanded ? (
                    <div className="offsidian-folder-files">
                      {notes.map((note) => (
                        <NoteRow
                          key={note.id}
                          note={note}
                          active={selected.id === note.id}
                          favorite={favorites.includes(note.id)}
                          onOpen={() => open(note)}
                        />
                      ))}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>

          {normalizedFilter && ![...visibleByGroup.values()].some((notes) => notes.length) ? (
            <div className="offsidian-tree-empty">
              <Search aria-hidden="true" />
              <p>Aucun fichier pour « {filter} ».</p>
              <button type="button" onClick={onOpenSearch}>Chercher dans le contenu</button>
            </div>
          ) : null}
        </div>

        <div className="offsidian-sidebar-footer">
          <span className="offsidian-status-dot" aria-hidden="true" />
          <span>{manifest.stats.notes} notes synchronisées</span>
          <span>lecture seule</span>
        </div>
      </aside>
    </>
  )
}

/* L'explorateur liste 344 fichiers : il ne doit pas être re-rendu quand la
   barre de progression ou le titre actif changent. */
export default memo(VaultSidebar)

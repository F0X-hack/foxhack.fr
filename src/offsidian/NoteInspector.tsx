import { useMemo, useState } from 'react'
import { ChevronRight, Clock3, ExternalLink, FileText, Link2, Network, Tag, X } from 'lucide-react'
import type { OpenNote, VaultManifest, VaultNote } from './types'
import { formatDate, shortTitle } from './utils'

type InspectorTab = 'outline' | 'links'

type NoteInspectorProps = {
  manifest: VaultManifest
  note: VaultNote
  activeHeading: string
  mobileOpen: boolean
  onCloseMobile: () => void
  onOpenNote: OpenNote
  onOpenGraph: () => void
  onJumpToHeading: (slug: string) => void
}

export default function NoteInspector({
  manifest,
  note,
  activeHeading,
  mobileOpen,
  onCloseMobile,
  onOpenNote,
  onOpenGraph,
  onJumpToHeading,
}: NoteInspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('outline')
  const noteById = useMemo(() => new Map(manifest.notes.map((item) => [item.id, item])), [manifest.notes])
  const outline = note.headings.filter((heading) => heading.depth >= 2 && heading.depth <= 3)
  const backlinks = note.backlinks.flatMap((id) => (noteById.has(id) ? [noteById.get(id)!] : []))
  const outgoing = [...new Set(note.links.map((link) => link.id))].flatMap((id) =>
    noteById.has(id) ? [noteById.get(id)!] : [],
  )
  const extraProperties = Object.entries(note.properties).filter(
    ([key, value]) => !['type', 'statut'].includes(key) && value,
  )

  return (
    <>
      <button
        type="button"
        className={`offsidian-inspector-scrim ${mobileOpen ? 'is-open' : ''}`}
        onClick={onCloseMobile}
        aria-label="Fermer le panneau de la note"
      />
      <aside className={`offsidian-inspector ${mobileOpen ? 'is-mobile-open' : ''}`} aria-label="Informations sur la note">
        <div className="offsidian-inspector-tabs">
          <button type="button" className={tab === 'outline' ? 'is-active' : ''} onClick={() => setTab('outline')}>
            Plan
          </button>
          <button type="button" className={tab === 'links' ? 'is-active' : ''} onClick={() => setTab('links')}>
            Liens <span>{backlinks.length + outgoing.length}</span>
          </button>
          <button type="button" className="offsidian-icon-btn offsidian-mobile-only" onClick={onCloseMobile} aria-label="Fermer">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="offsidian-inspector-scroll">
          {tab === 'outline' ? (
            <>
              <section className="offsidian-properties">
                <p className="offsidian-inspector-title">Propriétés</p>
                <dl>
                  <div><dt><FileText aria-hidden="true" /> type</dt><dd>{note.type}</dd></div>
                  <div><dt><Tag aria-hidden="true" /> catégorie</dt><dd>{note.category}</dd></div>
                  <div><dt><Clock3 aria-hidden="true" /> lecture</dt><dd>{note.readTime} min</dd></div>
                  <div><dt>◷ modifiée</dt><dd>{formatDate(note.modified)}</dd></div>
                  <div><dt>≡ mots</dt><dd>{note.words.toLocaleString('fr-FR')}</dd></div>
                  <div><dt>● statut</dt><dd className={note.status === 'publie' ? 'is-published' : 'is-draft'}>{note.status}</dd></div>
                  {extraProperties.map(([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {/^(?:https?:)?\/\//i.test(value) ? (
                          <a href={value} target="_blank" rel="noopener noreferrer">
                            ouvrir <ExternalLink aria-hidden="true" />
                          </a>
                        ) : value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {note.tags.length ? (
                  <div className="offsidian-property-tags">
                    {note.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                ) : null}
              </section>

              <section className="offsidian-outline">
                <p className="offsidian-inspector-title">Sur cette page</p>
                {outline.length ? (
                  <nav aria-label="Plan de la note">
                    {outline.map((heading) => (
                      <button
                        type="button"
                        key={`${heading.slug}-${heading.depth}`}
                        className={`${heading.depth === 3 ? 'is-depth-3' : ''} ${activeHeading === heading.slug ? 'is-active' : ''}`}
                        onClick={() => onJumpToHeading(heading.slug)}
                      >
                        <span>{heading.text}</span>
                      </button>
                    ))}
                  </nav>
                ) : <p className="offsidian-inspector-empty">Aucune section dans cette note.</p>}
              </section>
            </>
          ) : (
            <div className="offsidian-links-panel">
              <button type="button" className="offsidian-local-graph-button" onClick={onOpenGraph}>
                <span><Network aria-hidden="true" /></span>
                <div><strong>Ouvrir le graphe local</strong><small>Visualiser les connexions</small></div>
                <ChevronRight aria-hidden="true" />
              </button>

              <section>
                <p className="offsidian-inspector-title"><Link2 aria-hidden="true" /> Backlinks <span>{backlinks.length}</span></p>
                {backlinks.length ? backlinks.slice(0, 18).map((item) => (
                  <button type="button" className="offsidian-linked-note" key={item.id} onClick={() => onOpenNote(item.id)}>
                    <span>{shortTitle(item)}</span><small>{item.group}</small>
                  </button>
                )) : <p className="offsidian-inspector-empty">Aucune note ne pointe ici.</p>}
              </section>

              <section>
                <p className="offsidian-inspector-title"><Link2 aria-hidden="true" /> Liens sortants <span>{outgoing.length}</span></p>
                {outgoing.length ? outgoing.slice(0, 18).map((item) => (
                  <button type="button" className="offsidian-linked-note" key={item.id} onClick={() => onOpenNote(item.id)}>
                    <span>{shortTitle(item)}</span><small>{item.group}</small>
                  </button>
                )) : <p className="offsidian-inspector-empty">Aucun lien sortant.</p>}
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

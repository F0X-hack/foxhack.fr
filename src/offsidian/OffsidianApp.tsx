import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Eye,
  FileText,
  Focus,
  Home,
  Link2,
  Maximize2,
  Menu,
  Network,
  PanelRight,
  Search,
  Star,
  X,
} from 'lucide-react'
import BrandMark from '../components/icons/BrandMark'
import MarkdownNote from './MarkdownNote'
import NoteInspector from './NoteInspector'
import SearchPalette from './SearchPalette'
import VaultGraph from './VaultGraph'
import VaultSidebar from './VaultSidebar'
import type { OpenNote, VaultManifest, VaultNote } from './types'
import { createVaultResolver, formatDate, shortTitle, vaultFileUrl } from './utils'

const sourceCache = new Map<string, string>()
const FAVORITES_KEY = 'offsidian:favorites'
const RECENT_KEY = 'offsidian:recent'

function readStoredList(key: string) {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function VaultLoading({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  return (
    <main className="offsidian-loading">
      <div className="offsidian-loading-mark" aria-hidden="true"><span>◇</span></div>
      <p className="offsidian-loading-kicker">FOXHACK / KNOWLEDGE BASE</p>
      <h1>OFF<span>SIDIAN</span></h1>
      {error ? (
        <>
          <p className="offsidian-loading-error">Impossible d’ouvrir le vault.<br />{error}</p>
          <button type="button" onClick={onRetry}>Réessayer</button>
        </>
      ) : (
        <div className="offsidian-loading-line"><i /><span>montage du vault…</span></div>
      )}
    </main>
  )
}

function getRequestedNoteId() {
  return new URLSearchParams(window.location.search).get('note') || ''
}

function setMeta(note: VaultNote) {
  document.title = `${shortTitle(note)} — Offsidian · FoXhack`
  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) description.content = note.excerpt
}

export default function OffsidianApp() {
  const [manifest, setManifest] = useState<VaultManifest | null>(null)
  const [manifestError, setManifestError] = useState('')
  const [manifestAttempt, setManifestAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [source, setSource] = useState('')
  const [sourceError, setSourceError] = useState('')
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceAttempt, setSourceAttempt] = useState(0)
  const [pendingHash, setPendingHash] = useState(() => window.location.hash.replace(/^#/, ''))
  const [favorites, setFavorites] = useState<string[]>(() => readStoredList(FAVORITES_KEY))
  const [recent, setRecent] = useState<string[]>(() => readStoredList(RECENT_KEY))
  const [searchOpen, setSearchOpen] = useState(false)
  const [graphOpen, setGraphOpen] = useState(false)
  const [leftMobileOpen, setLeftMobileOpen] = useState(false)
  const [rightMobileOpen, setRightMobileOpen] = useState(false)
  const [rawMode, setRawMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [readingProgress, setReadingProgress] = useState(0)
  const [activeHeading, setActiveHeading] = useState('')
  const documentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    setManifestError('')
    fetch('/offsidian/manifest.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<VaultManifest>
      })
      .then((data) => {
        setManifest(data)
        const requested = getRequestedNoteId()
        const exists = data.notes.some((note) => note.id === requested)
        setSelectedId(exists ? requested : data.defaultNote)
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setManifestError(reason instanceof Error ? reason.message : 'Erreur inconnue')
      })
    return () => controller.abort()
  }, [manifestAttempt])

  const resolver = useMemo(() => (manifest ? createVaultResolver(manifest) : null), [manifest])
  const selected = useMemo(
    () => manifest?.notes.find((note) => note.id === selectedId) ?? null,
    [manifest, selectedId],
  )

  const openNote: OpenNote = useCallback((id, hash = '', options) => {
    if (!manifest || !manifest.notes.some((note) => note.id === id)) return
    const nextUrl = new URL('/offsidian/', window.location.origin)
    nextUrl.searchParams.set('note', id)
    if (hash) nextUrl.hash = hash.startsWith('#') ? hash : `#${hash}`
    window.history[options?.replace ? 'replaceState' : 'pushState']({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`)
    setPendingHash(hash.replace(/^#/, ''))
    setSelectedId(id)
    setLeftMobileOpen(false)
    setRightMobileOpen(false)
    setRawMode(false)

    if (id === selectedId) {
      if (hash) {
        requestAnimationFrame(() => document.getElementById(hash.replace(/^#/, ''))?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      } else {
        documentRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [manifest, selectedId])

  useEffect(() => {
    const onPopState = () => {
      if (!manifest) return
      const requested = getRequestedNoteId()
      setSelectedId(manifest.notes.some((note) => note.id === requested) ? requested : manifest.defaultNote)
      setPendingHash(window.location.hash.replace(/^#/, ''))
      setRawMode(false)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [manifest])

  useEffect(() => {
    if (!selected) return
    setMeta(selected)
    setSourceError('')
    setSource('')
    setSourceLoading(true)
    setReadingProgress(0)
    setActiveHeading(selected.headings.find((heading) => heading.depth >= 2)?.slug ?? '')
    documentRef.current?.scrollTo({ top: 0 })

    setRecent((current) => {
      const next = [selected.id, ...current.filter((id) => id !== selected.id)].slice(0, 12)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
      return next
    })

    const cached = sourceCache.get(selected.path)
    if (cached !== undefined) {
      setSource(cached)
      setSourceLoading(false)
      return
    }

    const controller = new AbortController()
    fetch(vaultFileUrl(selected.path), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.text()
      })
      .then((value) => {
        sourceCache.set(selected.path, value)
        setSource(value)
        setSourceLoading(false)
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return
        setSourceError(reason instanceof Error ? reason.message : 'Note illisible')
        setSourceLoading(false)
      })
    return () => controller.abort()
  }, [selected, sourceAttempt])

  useEffect(() => {
    if (!source || !pendingHash) return
    const timeout = window.setTimeout(() => {
      document.getElementById(pendingHash)?.scrollIntoView({ block: 'start' })
      setPendingHash('')
    }, 120)
    return () => window.clearTimeout(timeout)
  }, [pendingHash, source])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase('fr') === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setGraphOpen(false)
        setLeftMobileOpen(false)
        setRightMobileOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!searchOpen && !graphOpen && !leftMobileOpen && !rightMobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [graphOpen, leftMobileOpen, rightMobileOpen, searchOpen])

  if (manifestError) return <VaultLoading error={manifestError} onRetry={() => setManifestAttempt((value) => value + 1)} />
  if (!manifest || !resolver || !selected) return <VaultLoading />

  const groupNotes = manifest.notes.filter((note) => note.group === selected.group)
  const currentIndex = groupNotes.findIndex((note) => note.id === selected.id)
  const previous = currentIndex > 0 ? groupNotes[currentIndex - 1] : null
  const next = currentIndex >= 0 && currentIndex < groupNotes.length - 1 ? groupNotes[currentIndex + 1] : null
  const isFavorite = favorites.includes(selected.id)

  const toggleFavorite = () => {
    setFavorites((current) => {
      const nextFavorites = current.includes(selected.id)
        ? current.filter((id) => id !== selected.id)
        : [selected.id, ...current]
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(nextFavorites))
      return nextFavorites
    })
  }

  const updateScrollState = () => {
    const container = documentRef.current
    if (!container) return
    const available = container.scrollHeight - container.clientHeight
    setReadingProgress(available > 0 ? Math.min(100, (container.scrollTop / available) * 100) : 0)

    const headings = [...container.querySelectorAll<HTMLElement>('.offsidian-markdown h2[id], .offsidian-markdown h3[id]')]
    let current = headings[0]?.id ?? ''
    for (const heading of headings) {
      if (heading.offsetTop - container.scrollTop <= 150) current = heading.id
      else break
    }
    setActiveHeading(current)
  }

  const jumpToHeading = (slug: string) => {
    const target = document.getElementById(slug)
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const url = new URL(window.location.href)
    url.hash = slug
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const copyCurrentLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 1500)
    } catch {
      setCopiedLink(false)
    }
  }

  return (
    <div className={`offsidian-app ${focusMode ? 'is-focus-mode' : ''}`}>
      <header className="offsidian-topbar">
        <div className="offsidian-topbar-left">
          <button type="button" className="offsidian-icon-btn offsidian-menu-button" onClick={() => setLeftMobileOpen(true)} aria-label="Ouvrir l’explorateur">
            <Menu aria-hidden="true" />
          </button>
          <a href="/" className="offsidian-brand-link" aria-label="Retour à FoXhack.fr">
            <BrandMark variant="wordmark" className="offsidian-wordmark" title="FoXhack" />
          </a>
          <span className="offsidian-topbar-divider" />
          <a href="/offsidian/" className="offsidian-product-mark" aria-label="Accueil Offsidian">
            <span aria-hidden="true">◇</span>
            <strong>OFFSIDIAN</strong>
          </a>
        </div>

        <button type="button" className="offsidian-command-search" onClick={() => setSearchOpen(true)}>
          <Search aria-hidden="true" />
          <span>Rechercher dans le vault</span>
          <kbd>⌘ K</kbd>
        </button>

        <div className="offsidian-topbar-actions">
          <span className="offsidian-readonly"><i /> lecture seule</span>
          <button type="button" className="offsidian-icon-btn" onClick={() => setGraphOpen(true)} title="Graphe local" aria-label="Ouvrir le graphe local">
            <Network aria-hidden="true" />
          </button>
          <button type="button" className={`offsidian-icon-btn ${focusMode ? 'is-active' : ''}`} onClick={() => setFocusMode((value) => !value)} title="Mode concentration" aria-pressed={focusMode}>
            {focusMode ? <X aria-hidden="true" /> : <Focus aria-hidden="true" />}
          </button>
          <a href="/" className="offsidian-icon-btn" title="Retour au portfolio" aria-label="Retour au portfolio">
            <Home aria-hidden="true" />
          </a>
        </div>
        <div className="offsidian-progress" style={{ width: `${readingProgress}%` }} />
      </header>

      <div className="offsidian-workspace">
        <VaultSidebar
          manifest={manifest}
          selected={selected}
          favorites={favorites}
          recent={recent}
          mobileOpen={leftMobileOpen}
          onCloseMobile={() => setLeftMobileOpen(false)}
          onOpenNote={openNote}
          onOpenSearch={() => setSearchOpen(true)}
        />

        <main className="offsidian-document-column">
          <div className="offsidian-tabbar">
            <div className="offsidian-note-tab is-active">
              <FileText aria-hidden="true" />
              <span>{shortTitle(selected)}</span>
              <i />
            </div>
            <button type="button" className="offsidian-icon-btn offsidian-inspector-button" onClick={() => setRightMobileOpen(true)} aria-label="Ouvrir le panneau de la note">
              <PanelRight aria-hidden="true" />
            </button>
          </div>

          <section
            ref={documentRef}
            className="offsidian-document-scroll"
            onScroll={updateScrollState}
            aria-label={`Note : ${selected.title}`}
          >
            <div className="offsidian-document-shell">
              <nav className="offsidian-breadcrumbs" aria-label="Fil d’Ariane">
                <button type="button" onClick={() => openNote('sommaire')}><span aria-hidden="true">◇</span> Offsidian</button>
                <ChevronRight aria-hidden="true" />
                <span>{selected.group}</span>
                <ChevronRight aria-hidden="true" />
                <strong>{shortTitle(selected)}</strong>
              </nav>

              <div className="offsidian-note-toolbar">
                <div className="offsidian-note-context">
                  <span>{selected.type}</span>
                  <span>{selected.category}</span>
                  <span>{selected.readTime} min</span>
                  <span>{formatDate(selected.modified)}</span>
                </div>
                <div className="offsidian-note-actions">
                  <button type="button" className={rawMode ? 'is-active' : ''} onClick={() => setRawMode((value) => !value)} aria-pressed={rawMode}>
                    {rawMode ? <Eye aria-hidden="true" /> : <Code2 aria-hidden="true" />}
                    <span>{rawMode ? 'lecture' : 'source'}</span>
                  </button>
                  <button type="button" className={isFavorite ? 'is-active' : ''} onClick={toggleFavorite} aria-pressed={isFavorite}>
                    <Star aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
                    <span>{isFavorite ? 'favori' : 'favoriser'}</span>
                  </button>
                  <button type="button" onClick={copyCurrentLink}>
                    {copiedLink ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />}
                    <span>{copiedLink ? 'copié' : 'partager'}</span>
                  </button>
                </div>
              </div>

              <div className="offsidian-note-path"><FileText aria-hidden="true" /> {selected.path}</div>

              {sourceLoading ? (
                <div className="offsidian-note-loading"><span /><p>Ouverture de la note…</p></div>
              ) : sourceError ? (
                <div className="offsidian-note-error">
                  <BookOpen aria-hidden="true" />
                  <h1>Note indisponible</h1>
                  <p>{sourceError}</p>
                  <button type="button" onClick={() => setSourceAttempt((value) => value + 1)}>Réessayer</button>
                </div>
              ) : rawMode ? (
                <div className="offsidian-raw-view">
                  <div><Code2 aria-hidden="true" /><span>Markdown brut</span><small>{selected.path}</small></div>
                  <pre>{source}</pre>
                </div>
              ) : (
                <MarkdownNote source={source} note={selected} manifest={manifest} resolver={resolver} onOpenNote={openNote} />
              )}

              {!sourceLoading && !sourceError ? (
                <footer className="offsidian-note-footer">
                  <div className="offsidian-note-end"><span>EOF</span><i /></div>
                  <p>Usage pédagogique et environnements autorisés uniquement.</p>
                  <div className="offsidian-note-pagination">
                    {previous ? (
                      <button type="button" onClick={() => openNote(previous.id)}>
                        <ChevronLeft aria-hidden="true" /><span><small>Note précédente</small><strong>{shortTitle(previous)}</strong></span>
                      </button>
                    ) : <span />}
                    {next ? (
                      <button type="button" onClick={() => openNote(next.id)}>
                        <span><small>Note suivante</small><strong>{shortTitle(next)}</strong></span><ChevronRight aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                </footer>
              ) : null}
            </div>
          </section>
        </main>

        <NoteInspector
          manifest={manifest}
          note={selected}
          activeHeading={activeHeading}
          mobileOpen={rightMobileOpen}
          onCloseMobile={() => setRightMobileOpen(false)}
          onOpenNote={openNote}
          onOpenGraph={() => setGraphOpen(true)}
          onJumpToHeading={jumpToHeading}
        />
      </div>

      <nav className="offsidian-mobile-nav" aria-label="Navigation du vault">
        <button type="button" onClick={() => setLeftMobileOpen(true)}><Menu aria-hidden="true" /><span>Fichiers</span></button>
        <button type="button" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Recherche</span></button>
        <button type="button" onClick={() => setGraphOpen(true)}><Network aria-hidden="true" /><span>Graphe</span></button>
        <button type="button" onClick={() => setRightMobileOpen(true)}><PanelRight aria-hidden="true" /><span>Plan</span></button>
      </nav>

      <SearchPalette
        open={searchOpen}
        manifest={manifest}
        recent={recent}
        favorites={favorites}
        onClose={() => setSearchOpen(false)}
        onOpenNote={openNote}
      />
      <VaultGraph
        open={graphOpen}
        manifest={manifest}
        selected={selected}
        onClose={() => setGraphOpen(false)}
        onOpenNote={openNote}
      />
    </div>
  )
}

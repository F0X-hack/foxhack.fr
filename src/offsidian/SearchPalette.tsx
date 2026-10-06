import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, FileCode2, FileText, Search, Star, Wrench, X } from 'lucide-react'
import type {
  OpenNote,
  VaultGroup,
  VaultManifest,
  VaultNote,
  VaultOutline,
  VaultSearchIndex,
} from './types'
import { loadSearchIndex } from './searchIndex'
import { normalizeSearch, shortTitle } from './utils'

type Filter = 'Toutes' | 'Guides' | 'Techniques' | 'Outils'
const FILTERS: Filter[] = ['Toutes', 'Guides', 'Techniques', 'Outils']

/** Termes de l'index qui commencent par `prefix` (clés triées), 80 au plus. */
function keysWithPrefix(sortedKeys: string[], prefix: string) {
  let low = 0
  let high = sortedKeys.length
  while (low < high) {
    const middle = (low + high) >> 1
    if (sortedKeys[middle] < prefix) low = middle + 1
    else high = middle
  }
  const found: string[] = []
  for (let index = low; index < sortedKeys.length && found.length < 80; index += 1) {
    if (!sortedKeys[index].startsWith(prefix)) break
    found.push(sortedKeys[index])
  }
  return found
}

function ResultIcon({ note }: { note: VaultNote }) {
  const Icon = note.group === 'Outils' ? Wrench : note.group === 'Techniques' ? FileCode2 : note.group === 'Guides' ? BookOpen : FileText
  return <Icon aria-hidden="true" />
}

function Highlight({ text, query, normalizedQuery }: { text: string; query: string; normalizedQuery: string }) {
  if (!normalizedQuery) return <>{text}</>
  const normalizedText = normalizeSearch(text)
  const at = normalizedText.indexOf(normalizedQuery)
  if (at < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, at)}
      <mark>{text.slice(at, at + query.length)}</mark>
      {text.slice(at + query.length)}
    </>
  )
}

type SearchPaletteProps = {
  open: boolean
  manifest: VaultManifest
  outline: VaultOutline | null
  recent: string[]
  favorites: string[]
  onClose: () => void
  onOpenNote: OpenNote
}

export default function SearchPalette({
  open,
  manifest,
  outline,
  recent,
  favorites,
  onClose,
  onOpenNote,
}: SearchPaletteProps) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  /* Normalisée une fois : `Highlight` s'en sert sur chaque ligne de résultat. */
  const normalizedQuery = useMemo(() => normalizeSearch(deferredQuery), [deferredQuery])
  const [filter, setFilter] = useState<Filter>('Toutes')
  const [activeIndex, setActiveIndex] = useState(0)
  const [searchIndex, setSearchIndex] = useState<VaultSearchIndex | null>(null)
  const [indexFailed, setIndexFailed] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const noteById = useMemo(() => new Map(manifest.notes.map((note) => [note.id, note])), [manifest.notes])

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    setActiveIndex(0)

    let cancelled = false
    if (!searchIndex && !indexFailed) {
      loadSearchIndex()
        .then((index) => {
          if (!cancelled) setSearchIndex(index)
        })
        .catch(() => {
          if (!cancelled) setIndexFailed(true)
        })
    }
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
    }
  }, [indexFailed, open, searchIndex])

  /* Champs normalisés une fois par manifeste : repasser 344 notes dans
     `normalizeSearch` (NFD + minuscules) à chaque frappe coûte plus cher que
     la recherche elle-même. */
  const searchable = useMemo(
    () =>
      manifest.notes.map((note) => ({
        note,
        title: normalizeSearch(note.title),
        name: normalizeSearch(note.name),
        taxonomy: normalizeSearch(`${note.category} ${note.tags.join(' ')} ${note.group}`),
        headings: normalizeSearch((outline?.[note.id]?.headings ?? []).map(([, text]) => text).join(' ')),
        excerpt: normalizeSearch(note.excerpt),
      })),
    [manifest.notes, outline],
  )

  /* L'index compte ~25 000 termes : triés une fois, ceux qui commencent par la
     saisie se trouvent par dichotomie au lieu d'être tous parcourus. */
  const sortedIndexKeys = useMemo(() => (searchIndex ? Object.keys(searchIndex).sort() : null), [searchIndex])

  const results = useMemo(() => {
    const normalized = normalizeSearch(deferredQuery)
    const filterNote = (note: VaultNote) => filter === 'Toutes' || note.group === filter

    if (!normalized) {
      const suggestedIds = [...favorites, ...recent, 'sommaire', 'index']
      const seen = new Set<string>()
      const suggestions = suggestedIds.flatMap((id) => {
        const note = noteById.get(id)
        if (!note || seen.has(id) || !filterNote(note)) return []
        seen.add(id)
        return [note]
      })
      const guides = manifest.notes.filter((note) => note.group === 'Guides' && filterNote(note) && !seen.has(note.id))
      return [...suggestions, ...guides].slice(0, 18)
    }

    const tokens = normalized.split(/[^a-z0-9+#.-]+/).filter((token) => token.length >= 2)
    const scores = new Map<number, number>()
    const fullTextHits = new Map<number, number>()

    searchable.forEach(({ note, title, name, taxonomy, headings, excerpt }, index) => {
      if (!filterNote(note)) return
      let score = 0
      if (title === normalized || name === normalized) score += 160
      if (title.startsWith(normalized) || name.startsWith(normalized)) score += 90
      if (title.includes(normalized) || name.includes(normalized)) score += 65
      if (taxonomy.includes(normalized)) score += 38
      if (headings.includes(normalized)) score += 26
      if (excerpt.includes(normalized)) score += 18
      for (const token of tokens) {
        if (title.includes(token)) score += 14
        if (taxonomy.includes(token)) score += 5
      }
      if (score) scores.set(index, score)
    })

    if (searchIndex && tokens.length) {
      for (const token of tokens) {
        const matchingKeys = searchIndex[token]
          ? [token]
          : token.length >= 3 && sortedIndexKeys
            ? keysWithPrefix(sortedIndexKeys, token)
            : []
        const tokenHits = new Set<number>()
        for (const key of matchingKeys) {
          for (const noteIndex of searchIndex[key] ?? []) tokenHits.add(noteIndex)
        }
        for (const noteIndex of tokenHits) {
          const note = manifest.notes[noteIndex]
          if (note && filterNote(note)) fullTextHits.set(noteIndex, (fullTextHits.get(noteIndex) ?? 0) + 1)
        }
      }
      for (const [index, hitCount] of fullTextHits) {
        scores.set(index, (scores.get(index) ?? 0) + hitCount * 9 + (hitCount === tokens.length ? 18 : 0))
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || manifest.notes[a[0]].title.localeCompare(manifest.notes[b[0]].title, 'fr'))
      .slice(0, 30)
      .map(([index]) => manifest.notes[index])
  }, [deferredQuery, favorites, filter, manifest.notes, noteById, recent, searchable, searchIndex, sortedIndexKeys])

  useEffect(() => setActiveIndex(0), [deferredQuery, filter])

  useEffect(() => {
    if (!open || !results[activeIndex]) return
    document.getElementById(`offsidian-result-${results[activeIndex].id}`)?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, results])

  const select = (note: VaultNote) => {
    onOpenNote(note.id)
    onClose()
    setQuery('')
  }

  if (!open) return null

  return (
    <div className="offsidian-modal-layer" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose()
    }}>
      <section
        className="offsidian-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Recherche dans Offsidian"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((index) => Math.min(index + 1, results.length - 1))
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((index) => Math.max(index - 1, 0))
          }
          if (event.key === 'Enter' && results[activeIndex]) {
            event.preventDefault()
            select(results[activeIndex])
          }
        }}
      >
        <div className="offsidian-search-input-row">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher dans les 344 notes…"
            aria-label="Rechercher dans toutes les notes"
          />
          {!searchIndex && !indexFailed ? <span className="offsidian-indexing">indexation…</span> : null}
          <kbd>ESC</kbd>
          <button type="button" onClick={onClose} aria-label="Fermer la recherche">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="offsidian-search-filters" aria-label="Filtrer les résultats">
          {FILTERS.map((item) => (
            <button
              type="button"
              key={item}
              className={filter === item ? 'is-active' : ''}
              onClick={() => setFilter(item)}
            >
              {item}
              {item !== 'Toutes' ? <span>{manifest.groups[item as VaultGroup]}</span> : null}
            </button>
          ))}
        </div>

        <div className="offsidian-search-results" role="listbox" aria-label="Résultats de recherche">
          <div className="offsidian-results-label">
            <span>{query ? `${results.length} résultat${results.length > 1 ? 's' : ''}` : 'Accès rapide'}</span>
            {query && searchIndex ? <span>recherche plein texte</span> : null}
          </div>
          {results.map((note, index) => (
            <button
              type="button"
              key={note.id}
              id={`offsidian-result-${note.id}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`offsidian-search-result ${index === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => select(note)}
            >
              <span className="offsidian-result-icon"><ResultIcon note={note} /></span>
              <span className="offsidian-result-copy">
                <strong><Highlight text={shortTitle(note)} query={query} normalizedQuery={normalizedQuery} /></strong>
                <small>{note.excerpt}</small>
                <span>
                  {note.group} <b>/</b> {note.category}
                  {favorites.includes(note.id) ? <Star aria-label="Favori" /> : null}
                </span>
              </span>
              <span className="offsidian-result-open">↵</span>
            </button>
          ))}
          {!results.length ? (
            <div className="offsidian-search-empty">
              <Search aria-hidden="true" />
              <strong>Aucune note trouvée</strong>
              <p>Essaie un outil, une technique, un tag ou une commande.</p>
            </div>
          ) : null}
        </div>

        <footer className="offsidian-search-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
          <span><kbd>↵</kbd> ouvrir</span>
          <span><kbd>⌘</kbd><kbd>K</kbd> rechercher</span>
        </footer>
      </section>
    </div>
  )
}

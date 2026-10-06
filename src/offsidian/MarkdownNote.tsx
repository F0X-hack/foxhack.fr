import React, { cloneElement, isValidElement, useEffect, useId, useMemo, useState } from 'react'
import ReactMarkdown, { type Components, defaultUrlTransform } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  FileQuestion,
  Image as ImageIcon,
  Info,
  Lightbulb,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import type { OpenNote, VaultManifest, VaultNote } from './types'
import {
  headingSlug,
  isExternalUrl,
  noteUrl,
  prepareObsidianMarkdown,
  type VaultResolver,
} from './utils'

let mermaidReady = false

type MarkdownAstNode = {
  type?: string
  value?: string
  children?: MarkdownAstNode[]
  data?: { hProperties?: Record<string, unknown> }
}

function astText(node: MarkdownAstNode): string {
  if (typeof node.value === 'string') return node.value
  return node.children?.map(astText).join('') ?? ''
}

/** Donne aux titres exactement les mêmes ancres stables que le manifeste. */
function remarkOffsidianHeadings() {
  return (tree: MarkdownAstNode) => {
    const seen = new Map<string, number>()
    const walk = (node: MarkdownAstNode) => {
      if (node.type === 'heading') {
        const base = headingSlug(astText(node)) || 'section'
        const occurrence = seen.get(base) ?? 0
        seen.set(base, occurrence + 1)
        node.data = node.data ?? {}
        node.data.hProperties = {
          ...(node.data.hProperties ?? {}),
          id: occurrence ? `${base}-${occurrence}` : base,
        }
      }
      node.children?.forEach(walk)
    }
    walk(tree)
  }
}

function nodeText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(nodeText).join('')
  if (isValidElement<{ children?: React.ReactNode }>(node)) return nodeText(node.props.children)
  return ''
}

function removeFirstCalloutMarker(node: React.ReactNode, state = { removed: false }): React.ReactNode {
  if (typeof node === 'string') {
    if (state.removed) return node
    const next = node.replace(/^\s*\[![\w-]+\]\s*/i, '')
    if (next !== node) state.removed = true
    return next
  }
  if (Array.isArray(node)) return node.map((child) => removeFirstCalloutMarker(child, state))
  if (isValidElement<{ children?: React.ReactNode }>(node)) {
    return cloneElement(node, undefined, removeFirstCalloutMarker(node.props.children, state))
  }
  return node
}

const CALLOUTS: Record<string, { label: string; icon: LucideIcon }> = {
  info: { label: 'Information', icon: Info },
  note: { label: 'Note', icon: Info },
  tip: { label: 'Conseil', icon: Lightbulb },
  success: { label: 'Succès', icon: Check },
  warning: { label: 'Attention', icon: AlertTriangle },
  caution: { label: 'Attention', icon: AlertTriangle },
  danger: { label: 'Danger', icon: ShieldAlert },
  error: { label: 'Erreur', icon: ShieldAlert },
}

function Callout({ children }: { children?: React.ReactNode }) {
  const text = nodeText(children)
  const match = text.match(/^\s*\[!([\w-]+)\]/i)
  if (!match) return <blockquote>{children}</blockquote>
  const type = match[1].toLocaleLowerCase('fr')
  const config = CALLOUTS[type] ?? CALLOUTS.info
  const Icon = config.icon
  return (
    <aside className={`offsidian-callout offsidian-callout--${type}`}>
      <div className="offsidian-callout-label"><Icon aria-hidden="true" /> {config.label}</div>
      <div>{removeFirstCalloutMarker(children)}</div>
    </aside>
  )
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="offsidian-code-block">
      <div className="offsidian-code-head">
        <span>{language || 'texte'}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1400)
            } catch {
              setCopied(false)
            }
          }}
          aria-label="Copier le bloc de code"
        >
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'copié' : 'copier'}
        </button>
      </div>
      <pre><code className={language ? `language-${language}` : undefined}>{value}</code></pre>
    </div>
  )
}

function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId()
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const render = async () => {
      try {
        const { default: mermaid } = await import('mermaid')
        if (!mermaidReady) {
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'dark',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            themeVariables: {
              background: '#0e0e0f',
              primaryColor: '#191411',
              primaryTextColor: '#f1f0ec',
              primaryBorderColor: '#ff6a20',
              lineColor: '#8c8883',
              secondaryColor: '#121213',
              tertiaryColor: '#0a0a0b',
              noteBkgColor: '#17130f',
              noteTextColor: '#f1f0ec',
              noteBorderColor: '#8a4b27',
            },
            flowchart: { htmlLabels: true, curve: 'basis' },
          })
          mermaidReady = true
        }
        const id = `offsidian-mermaid-${reactId.replace(/[^a-zA-Z0-9]/g, '')}-${Math.random().toString(36).slice(2, 7)}`
        const result = await mermaid.render(id, chart)
        if (!cancelled) setSvg(result.svg)
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Diagramme illisible')
      }
    }
    void render()
    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  if (error) {
    return (
      <div className="offsidian-mermaid-error">
        <FileQuestion aria-hidden="true" />
        <div><strong>Diagramme Mermaid non rendu</strong><small>{error}</small></div>
        <details><summary>Voir la source</summary><CodeBlock language="mermaid" value={chart} /></details>
      </div>
    )
  }

  return (
    <figure className="offsidian-mermaid">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="offsidian-diagram-loading"><span /> rendu du diagramme…</div>}
      <figcaption>diagramme interactif · Mermaid</figcaption>
    </figure>
  )
}

function DataviewBlock({ query, manifest }: { query: string; manifest: VaultManifest }) {
  const targetsTools = /Outils|outil/i.test(query) && !/Techniques|technique/i.test(query)
  const targetsTechniques = /Techniques|technique/i.test(query) && !/Outils|outil/i.test(query)
  const notes = targetsTools
    ? manifest.notes.filter((note) => note.group === 'Outils')
    : targetsTechniques
      ? manifest.notes.filter((note) => note.group === 'Techniques')
      : manifest.notes
  const categories = Object.entries(
    notes.reduce<Record<string, number>>((result, note) => {
      result[note.category] = (result[note.category] ?? 0) + 1
      return result
    }, {}),
  ).sort((a, b) => b[1] - a[1]).slice(0, 6)

  return (
    <div className="offsidian-dataview">
      <div className="offsidian-dataview-head"><span>◫</span> vue dynamique Dataview</div>
      <div className="offsidian-dataview-stats">
        <div><strong>{manifest.stats.notes}</strong><span>notes</span></div>
        <div><strong>{manifest.stats.techniques}</strong><span>techniques</span></div>
        <div><strong>{manifest.stats.tools}</strong><span>outils</span></div>
        <div><strong>{manifest.stats.links.toLocaleString('fr-FR')}</strong><span>liens</span></div>
      </div>
      {categories.length ? (
        <div className="offsidian-dataview-categories">
          {categories.map(([category, count]) => <span key={category}>{category}<b>{count}</b></span>)}
        </div>
      ) : null}
      <details><summary>Afficher la requête originale</summary><CodeBlock language="dataview" value={query} /></details>
    </div>
  )
}

function ExternalImage({ src, alt }: { src: string; alt?: string }) {
  return (
    <span className="offsidian-external-image">
      <ImageIcon aria-hidden="true" />
      <span><strong>{alt || 'Image externe'}</strong><small>Chargement externe bloqué par défaut</small></span>
      <a href={src} target="_blank" rel="noopener noreferrer">ouvrir <ExternalLink aria-hidden="true" /></a>
    </span>
  )
}

type MarkdownNoteProps = {
  source: string
  note: VaultNote
  manifest: VaultManifest
  resolver: VaultResolver
  onOpenNote: OpenNote
}

export default function MarkdownNote({ source, note, manifest, resolver, onOpenNote }: MarkdownNoteProps) {
  const markdown = useMemo(() => prepareObsidianMarkdown(source, note, resolver), [note, resolver, source])

  const makeHeading = (level: 1 | 2 | 3 | 4) => {
    const Heading = `h${level}` as const
    return ({ children, id: providedId, ...props }: React.ComponentPropsWithoutRef<typeof Heading>) => {
      const id = providedId || headingSlug(nodeText(children)) || `section-${level}`
      return (
        <Heading id={id} {...props}>
          <a href={`#${id}`} aria-label={`Lien vers ${nodeText(children)}`} className="offsidian-heading-anchor">#</a>
          {children}
        </Heading>
      )
    }
  }

  const components: Components = {
    h1: makeHeading(1),
    h2: makeHeading(2),
    h3: makeHeading(3),
    h4: makeHeading(4),
    blockquote: ({ children }) => <Callout>{children}</Callout>,
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const value = String(children).replace(/\n$/, '')
      const language = className?.match(/language-([\w-]+)/)?.[1] ?? ''
      const isBlock = Boolean(language || String(children).includes('\n'))
      if (!isBlock) return <code className="offsidian-inline-code">{children}</code>
      if (language === 'mermaid') return <MermaidDiagram chart={value} />
      if (language === 'dataview' || language === 'dataviewjs') return <DataviewBlock query={value} manifest={manifest} />
      return <CodeBlock language={language} value={value} />
    },
    a: ({ href, children, ...props }) => {
      if (!href) return <span>{children}</span>
      if (href === '#lien-introuvable') {
        return <span className="offsidian-missing-link" title="Cette note n’est pas présente dans le vault">{children}</span>
      }
      if (href.startsWith('/offsidian/')) {
        return (
          <a
            href={href}
            {...props}
            className="offsidian-wikilink"
            onClick={(event) => {
              event.preventDefault()
              const url = new URL(href, window.location.origin)
              const id = url.searchParams.get('note')
              if (id) onOpenNote(id, url.hash.replace(/^#/, ''))
            }}
          >
            {children}
          </a>
        )
      }
      if (href.startsWith('#')) {
        return <a href={href} {...props}>{children}</a>
      }
      if (/\.md(?:#.*)?$/i.test(href)) {
        const [target, hash = ''] = href.split('#')
        const targetNote = resolver.resolveNote(note, target)
        if (targetNote) {
          return (
            <a
              href={noteUrl(targetNote, hash)}
              className="offsidian-wikilink"
              onClick={(event) => {
                event.preventDefault()
                onOpenNote(targetNote.id, hash)
              }}
            >
              {children}
            </a>
          )
        }
      }
      return (
        <a href={href} {...props} target={isExternalUrl(href) ? '_blank' : undefined} rel={isExternalUrl(href) ? 'noopener noreferrer' : undefined}>
          {children}{isExternalUrl(href) ? <ExternalLink className="offsidian-external-link-icon" aria-hidden="true" /> : null}
        </a>
      )
    },
    img: ({ src, alt }) => {
      if (!src) return null
      if (isExternalUrl(src)) return <ExternalImage src={src} alt={alt} />
      const localSource = src.startsWith('/') ? src : resolver.resolveAsset(note, src)
      if (!localSource) return <span className="offsidian-missing-image"><ImageIcon aria-hidden="true" /> {alt || src}</span>
      return (
        <figure className="offsidian-note-image">
          <img src={localSource} alt={alt ?? ''} loading="lazy" />
          {alt ? <figcaption>{alt}</figcaption> : null}
        </figure>
      )
    },
    table: ({ children }) => <div className="offsidian-table-wrap"><table>{children}</table></div>,
    hr: () => <hr aria-hidden="true" />,
  }

  return (
    <article className="offsidian-markdown" data-note-id={note.id}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkOffsidianHeadings]}
        skipHtml
        components={components}
        urlTransform={(url) => {
          if (url.startsWith('/offsidian/') || url.startsWith('#')) return url
          return defaultUrlTransform(url)
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Nfc, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ToolHeader from './ToolHeader'

type ToolCategory = 'NFC / RFID'
type CatalogFilter = 'Tous' | ToolCategory

type ToolEntry = {
  name: string
  category: ToolCategory
  description: string
  tags: string[]
  status: 'ready' | 'planned'
  href?: string
  icon: LucideIcon
}

const tools: ToolEntry[] = [
  {
    name: 'Mfkey32',
    category: 'NFC / RFID',
    description:
      'Récupère les clés MIFARE Classic à partir des nonces capturés : Flipper en Web Serial, fichier journal ou saisie manuelle. Le calcul reste dans le navigateur.',
    tags: ['MIFARE Classic', 'Flipper Zero', 'Web Serial'],
    status: 'ready',
    href: '/mfkey32/',
    icon: Nfc,
  },
]

const filters: CatalogFilter[] = ['Tous', 'NFC / RFID']

export default function ToolsPage() {
  const [filter, setFilter] = useState<CatalogFilter>('Tous')
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr')
    return tools.filter((tool) => {
      const matchesFilter = filter === 'Tous' || tool.category === filter
      const searchableText = [tool.name, tool.category, tool.description, ...tool.tags]
        .join(' ')
        .toLocaleLowerCase('fr')
      return matchesFilter && (!normalizedQuery || searchableText.includes(normalizedQuery))
    })
  }, [filter, query])

  const readyCount = tools.filter((tool) => tool.status === 'ready').length

  return (
    <div className="tools-page tools-catalog-page">
      <ToolHeader active="catalog" />

      <main className="tools-shell tools-main" id="contenu">
        <section className="tools-hero" aria-labelledby="tools-title">
          <div className="tools-hero__copy">
            <p className="tools-eyebrow"><span>FOXHACK</span> / LAB / OUTILS</p>
            <h1 id="tools-title">La boîte à outils<span className="tools-title-mark">.</span></h1>
            <p className="tools-hero__lede">
              Des utilitaires conçus pour apprendre, tester et gagner du temps — à utiliser uniquement dans un cadre autorisé.
            </p>
            <div className="tools-hero__meta">
              <span><span className="tools-status-dot" aria-hidden="true" /> {String(readyCount).padStart(2, '0')} DISPONIBLE</span>
              <span className="tools-meta-divider" aria-hidden="true">/</span>
              <span>MISE À JOUR CONTINUE</span>
            </div>
          </div>

          <aside className="tools-hero__note" aria-label="À propos de la boîte à outils">
            <span className="tools-hero__note-index">SYS / 001</span>
            <div className="tools-hero__note-rule" />
            <p>Un espace qui grandit au fil des outils développés au labo.</p>
            <span className="tools-hero__note-footer">NO TRACKING <span>·</span> NO BACKEND</span>
          </aside>
        </section>

        <section className="tools-catalog" id="catalogue" aria-labelledby="catalogue-title">
          <div className="tools-section-heading">
            <div>
              <p className="tools-eyebrow">INVENTAIRE / 0{tools.length}</p>
              <h2 id="catalogue-title">Catalogue</h2>
            </div>
            <p className="tools-section-heading__count" aria-live="polite">
              {filteredTools.length.toString().padStart(2, '0')} OUTILS AFFICHÉS
            </p>
          </div>

          <div className="tools-toolbar">
            <div className="tools-filters" aria-label="Filtrer par catégorie">
              {filters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`tools-filter ${filter === item ? 'is-active' : ''}`}
                  aria-pressed={filter === item}
                  onClick={() => setFilter(item)}
                >
                  {item.toLocaleUpperCase('fr')}
                </button>
              ))}
            </div>

            <label className="tools-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Rechercher dans le catalogue</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un outil…"
                autoComplete="off"
              />
              <kbd>/</kbd>
            </label>
          </div>

          {filteredTools.length > 0 ? (
            <ul className="tools-grid">
              {filteredTools.map((tool, index) => {
                const Icon = tool.icon
                const cardContent = (
                  <>
                    <div className="tools-card__topline">
                      <span className="tools-card__icon"><Icon aria-hidden="true" /></span>
                      <span className={`tools-card__status ${tool.status === 'ready' ? 'is-ready' : 'is-planned'}`}>
                        <span aria-hidden="true" />
                        {tool.status === 'ready' ? 'DISPONIBLE' : 'À VENIR'}
                      </span>
                    </div>
                    <div className="tools-card__content">
                      <p className="tools-card__category">{tool.category} <span>/</span> 0{index + 1}</p>
                      <h3>{tool.name}</h3>
                      <p className="tools-card__description">{tool.description}</p>
                    </div>
                    <ul className="tools-card__tags" aria-label="Technologies">
                      {tool.tags.map((tag) => <li key={tag}>{tag}</li>)}
                    </ul>
                    <div className="tools-card__action">
                      {tool.status === 'ready' ? (
                        <><span>OUVRIR L’OUTIL</span><ArrowUpRight aria-hidden="true" /></>
                      ) : (
                        <><span>EN PRÉPARATION</span><span className="tools-card__soon-mark" aria-hidden="true">···</span></>
                      )}
                    </div>
                  </>
                )

                return (
                  <li key={tool.name}>
                    {tool.href ? (
                      <a className="tools-card tools-card--link" href={tool.href}>
                        {cardContent}
                      </a>
                    ) : (
                      <article className="tools-card tools-card--planned" aria-label={`${tool.name}, bientôt disponible`}>
                        {cardContent}
                      </article>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="tools-empty-state" role="status">
              <Search aria-hidden="true" />
              <p>Aucun outil ne correspond à « {query} ».</p>
              <button type="button" onClick={() => { setQuery(''); setFilter('Tous') }}>
                Réinitialiser les filtres
              </button>
            </div>
          )}

          <div className="tools-catalog__footnote">
            <span className="tools-footnote-mark" aria-hidden="true">§</span>
            <p>
              Mfkey32 embarque un portage du moteur mfkey32v2 et de crapto1 (GPL-3) —{' '}
              <a href="/licenses/mfkey32-NOTICE.txt">notice et attributions</a>.
            </p>
          </div>
        </section>

        <section className="tools-callout" aria-label="Utilisation responsable">
          <div className="tools-callout__signal" aria-hidden="true">!</div>
          <div>
            <p className="tools-callout__title">Utilisation responsable</p>
            <p>Les outils de sécurité sont destinés aux labos, CTF et audits autorisés. Vérifie toujours le périmètre avant de tester.</p>
          </div>
          <span className="tools-callout__code">FOX / ETHICAL USE</span>
        </section>
      </main>

      <footer className="tools-footer">
        <div className="tools-shell tools-footer__inner">
          <span>© 2026 FOXHACK <span className="tools-footer__slash">/</span> OUTILS DU LABO</span>
          <a href="/">RETOUR AU PORTFOLIO <ArrowUpRight aria-hidden="true" /></a>
        </div>
      </footer>
    </div>
  )
}

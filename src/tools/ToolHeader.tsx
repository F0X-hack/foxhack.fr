import { ArrowUpRight } from 'lucide-react'

type ToolHeaderProps = {
  active?: 'catalog' | 'revshell' | 'cidr'
}

export default function ToolHeader({ active = 'catalog' }: ToolHeaderProps) {
  const toolsActive = active === 'catalog' || active === 'revshell' || active === 'cidr'

  return (
    <>
      <a className="tools-skip-link" href="#contenu">Aller au contenu</a>
      <header className="tools-header">
        <div className="tools-shell tools-header__inner">
          <a className="tools-brand" href="/" aria-label="FoXhack, accueil">
            <span className="tools-brand__mark" aria-hidden="true">F<span>/</span></span>
            <span className="tools-brand__wordmark">
              <strong>FOXHACK</strong>
              <small>SECURITY TOOLBOX</small>
            </span>
          </a>

          <nav className="tools-nav" aria-label="Navigation principale">
            <a href="/" className="tools-nav__link">PORTFOLIO <ArrowUpRight aria-hidden="true" /></a>
            <a
              href="/tools/"
              className={`tools-nav__link ${toolsActive ? 'is-active' : ''}`}
              aria-current={active === 'catalog' ? 'page' : active ? 'location' : undefined}
            >
              OUTILS <span className="tools-nav__index">01</span>
            </a>
          </nav>

          <div className="tools-header__status">
            <span className="tools-status-dot" aria-hidden="true" />
            <span>EN LIGNE</span>
            <span className="tools-header__separator">/</span>
            <span>100% CLIENT</span>
          </div>
        </div>
      </header>
    </>
  )
}

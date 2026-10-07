import { ArrowUpRight } from 'lucide-react'
import BrandMark from '../components/icons/BrandMark'

type ToolHeaderProps = {
  active?: 'catalog'
}

export default function ToolHeader({ active = 'catalog' }: ToolHeaderProps) {
  return (
    <>
      <a className="tools-skip-link" href="#contenu">Aller au contenu</a>
      <header className="tools-header">
        <div className="tools-shell tools-header__inner">
          <a className="tools-brand" href="/" aria-label="FoXhack, accueil">
            {/* wordmark dessiné (/brand/foxhack-wordmark.svg en masque :
                il suit la couleur du thème et reste net à toutes les tailles) */}
            <BrandMark variant="wordmark" className="tools-brand__wordmark" />
            <span className="tools-brand__caption">SECURITY TOOLBOX</span>
          </a>

          <nav className="tools-nav" aria-label="Navigation principale">
            <a href="/" className="tools-nav__link">PORTFOLIO <ArrowUpRight aria-hidden="true" /></a>
            <a
              href="/tools/"
              className={`tools-nav__link ${active === 'catalog' ? 'is-active' : ''}`}
              aria-current={active === 'catalog' ? 'page' : 'location'}
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

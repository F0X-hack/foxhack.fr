import { ArrowUp } from 'lucide-react'
import BrandMark from './icons/BrandMark'
import { footerLinks } from '../data/navigation'
import { profile } from '../data/profile'

export default function Footer() {
  return (
    <footer className="safe-bottom relative mt-10 border-t border-white/[0.07] pt-12">
      <div className="shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto]">
          {/* signature */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <BrandMark
                variant="wordmark"
                className="h-[30px] w-auto text-bone"
                title={profile.name}
              />
              <div>
                <p className="font-mono text-sm text-bone">© {profile.footer.year}</p>
                <p className="font-mono text-[0.6rem] uppercase tracking-widest2 text-dim">
                  {profile.title} · {profile.location.label} {profile.location.flag}
                </p>
              </div>
            </div>
          </div>

          {/* liens */}
          <nav aria-label="Footer" className="min-w-0">
            <p className="label">Elsewhere</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline inline-flex min-h-[44px] items-center font-mono text-[0.7rem] text-muted hover:text-bone sm:min-h-[32px]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.62rem] leading-relaxed text-dim">
            {profile.footer.disclaimer}
          </p>
          <a
            href="#top"
            className="inline-flex min-h-[40px] items-center gap-2 self-start font-mono text-[0.62rem] uppercase tracking-widest2 text-dim transition-colors hover:text-bone sm:self-auto"
          >
            back to top
            <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </footer>
  )
}

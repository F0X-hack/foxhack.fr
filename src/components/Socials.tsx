import { ArrowUpRight } from 'lucide-react'
import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import BrandIcon from './icons/BrandIcon'
import { socialGrid, socialsMeta } from '../data/socials'
import Spotlight from './ui/Spotlight'

/**
 * Survol monochrome par défaut ; l'accent signal est réservé aux plateformes
 * de sécurité. Pas d'arc-en-ciel de marques : on reste lisible et sobre.
 */
const HOVER_TINT: Record<string, string> = {
  github: 'group-hover:border-white/30 group-hover:text-white',
  instagram: 'group-hover:border-white/25 group-hover:text-bone',
  tiktok: 'group-hover:border-white/25 group-hover:text-bone',
  guns: 'group-hover:border-signal/45 group-hover:text-signal-soft',
  tryhackme: 'group-hover:border-signal/45 group-hover:text-signal-soft',
  hackthebox: 'group-hover:border-signal/45 group-hover:text-signal-soft',
  rootme: 'group-hover:border-signal/45 group-hover:text-signal-soft',
  evilfox: 'group-hover:border-signal/45 group-hover:text-signal-soft',
}

export default function Socials() {
  return (
    <section data-spot="socials" id="socials" className="section scroll-mt-24">
      <Spotlight
        tone="static"
        intensity="low"
        className="right-[-10rem] top-[6rem] h-[32rem] w-[32rem]"
      />

      <div className="shell">
        <SectionHeading
          title={socialsMeta.title}
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {socialGrid.map((social, index) => (
            <Reveal as="li" key={social.id} delay={index * 0.04} className="group card p-5 sm:p-6">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />

              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-sm border border-white/[0.09] bg-white/[0.02] text-muted transition-all duration-300 ${HOVER_TINT[social.icon] ?? ''}`}
                  >
                    <BrandIcon name={social.icon} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-mono text-[0.7rem] uppercase tracking-widest2 text-bone">
                      {social.platform}
                    </h3>
                    <p className="mt-1 truncate font-mono text-[0.66rem] text-muted">
                      {social.username}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted">{social.description}</p>

              {social.bio?.length || social.figures?.length ? (
                <div className="mt-4 rounded-sm border border-white/[0.06] bg-white/[0.015] p-4">
                  <span className="font-mono text-[0.64rem] uppercase tracking-widest2 text-dim">
                    {social.displayName}
                  </span>

                  {social.bio?.length ? (
                    <ul className="mt-3 space-y-1 font-mono text-[0.66rem] leading-relaxed text-muted">
                      {social.bio.map((line) => (
                        <li key={line} className="truncate" title={line}>
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {social.figures?.length ? (
                    <dl className="mt-4 grid grid-cols-3 gap-3">
                      {social.figures.map((entry) => (
                        <div key={entry.label} className="min-w-0">
                          <dd className="font-mono text-base font-semibold text-bone sm:text-lg">
                            {entry.value}
                          </dd>
                          <dt className="mt-0.5 font-mono text-[0.55rem] uppercase tracking-widest2 text-dim">
                            {entry.label}
                          </dt>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </div>
              ) : null}

              <a
                href={social.url}
                target={social.url.startsWith('https://') ? '_blank' : undefined}
                rel={social.url.startsWith('https://') ? 'noopener noreferrer' : undefined}
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-mono text-[0.66rem] uppercase tracking-widest2 text-muted transition-colors hover:text-bone"
              >
                {social.cta}
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </a>
            </Reveal>
          ))}
        </ul>

      </div>
    </section>
  )
}

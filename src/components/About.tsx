import { Quote, ArrowUpRight } from 'lucide-react'
import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import ProfileAvatar from './ui/ProfileAvatar'
import { profile } from '../data/profile'
import { labFiles } from '../data/navigation'

/* Les notes de travail — mêmes lignes que l'ancienne commande `cat profile.txt`.
   Le flux vient de profile.timeline, une donnée fournie qui n'était affichée
   nulle part ailleurs. */
const notes = [
  { key: 'FLOW', value: profile.timeline.flow },
  { key: 'MOTTO', value: profile.mottoAlt },
]

/**
 * WHO AM I? — la section qui porte l'identité.
 * Depuis le retrait de la console, c'est ici que se lisent les informations
 * qu'on allait chercher en tapant des commandes : l'identité (whoami.txt), les
 * notes de travail (profile.txt) et l'inventaire du labo, qui sert de carte du
 * site. Chaque ligne n'existe qu'à un seul endroit de la page.
 */
export default function About() {
  return (
    <section id="about" className="section scroll-mt-24">
      <div className="shell">
        <SectionHeading
          title="WHO AM I?"
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-14">
          {/* portrait + citation */}
          <Reveal className="flex flex-col items-center gap-8">
            <ProfileAvatar size="lg" />

            <figure className="panel relative w-full overflow-hidden p-5 sm:p-6">
              <Quote className="absolute right-4 top-4 h-5 w-5 text-signal/25" aria-hidden="true" />
              <blockquote className="text-base text-bone sm:text-lg">
                <span className="text-signal-soft" aria-hidden="true">
                  “
                </span>
                {profile.quote}
                <span className="text-signal-soft" aria-hidden="true">
                  ”
                </span>
              </blockquote>
              <figcaption className="mt-3 font-mono text-[0.62rem] uppercase tracking-widest2 text-dim">
                — {profile.name}
              </figcaption>
            </figure>
          </Reveal>

          {/* les deux fichiers de l'ancienne console, maintenant lisibles */}
          <div className="min-w-0 space-y-6">
            <Reveal delay={0.05}>
              <div className="panel p-5 sm:p-6">
                <dl className="divide-y divide-white/[0.06] font-mono text-[0.72rem] sm:text-sm">
                  {profile.whoami.map((row) => (
                    <div key={row.key} className="flex items-baseline gap-3 py-2.5">
                      <dt className="w-24 shrink-0 uppercase tracking-widest2 text-dim sm:w-28">
                        {row.key}
                      </dt>
                      <dd className="min-w-0 flex-1 text-bone">
                        {row.key === 'STATUS' ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-ok shadow-[0_0_8px_2px_rgba(125,211,95,0.45)]"
                              aria-hidden="true"
                            />
                            {row.value}
                          </span>
                        ) : (
                          row.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="panel p-5 sm:p-6">

                <dl className="divide-y divide-white/[0.06] font-mono text-[0.72rem] sm:text-sm">
                  {notes.map((row) => (
                    <div key={row.key} className="flex items-baseline gap-3 py-2.5">
                      <dt className="w-24 shrink-0 uppercase tracking-widest2 text-dim sm:w-28">
                        {row.key}
                      </dt>
                      <dd className="min-w-0 flex-1 text-bone">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </div>

        {/* inventaire du labo : la carte du site, cliquable */}
        <Reveal delay={0.15} className="mt-12">
          <div className="panel p-5 sm:p-6">

            <ul className="mt-2 grid sm:grid-cols-2 sm:gap-x-10">
              {labFiles.map((file) => {
                const content = (
                  <>
                    <span className="font-mono text-[0.78rem] text-bone transition-colors group-hover:text-white">
                      {file.name}
                    </span>
                    <span className="flex min-w-0 items-baseline gap-3">
                      <span className="truncate font-mono text-[0.6rem] uppercase tracking-widest2 text-dim">
                        {file.role}
                      </span>
                      {file.href ? (
                        <ArrowUpRight
                          className="h-3.5 w-3.5 shrink-0 text-dim transition-colors group-hover:text-bone"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                  </>
                )

                return (
                  <li key={file.name} className="border-b border-white/[0.05] last:border-0">
                    {file.href ? (
                      <a
                        href={file.href}
                        className="group flex min-h-[44px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 transition-colors"
                      >
                        {content}
                      </a>
                    ) : (
                      <span className="flex min-h-[44px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 opacity-70">
                        {content}
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

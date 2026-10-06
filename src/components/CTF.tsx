import { ArrowUpRight, CheckCircle2, Info } from 'lucide-react'
import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import BrandIcon from './icons/BrandIcon'
import MagneticButton from './ui/MagneticButton'
import { nextOps, platforms, platformsMeta } from '../data/platforms'
import Spotlight from './ui/Spotlight'

export default function CTF() {
  const [rootme, ...others] = platforms

  return (
    <section data-spot="ctf" id="ctf" className="section scroll-mt-24">
      <Spotlight
        tone="alert"
        intensity="low"
        className="left-[-14rem] top-[10rem] h-[34rem] w-[34rem]"
      />

      <div className="shell">
        <SectionHeading
          title={platformsMeta.title}
        />

        {/* ---------------------------------------------------------- ROOT-ME */}
        <Reveal className="mt-14">
          <article className="panel corners group/card relative overflow-hidden p-6 sm:p-8">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_130%_at_100%_0%,rgb(var(--alert)/0.1),transparent_62%)]"
            />

            <div className="relative flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-white/[0.09] bg-white/[0.02] text-bone">
                <BrandIcon name={rootme.icon} className="h-7 w-7" />
              </span>
              <div>
                <h3 className="font-mono text-lg text-bone">{rootme.name}</h3>
                <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-widest2 text-signal-soft/80">
                  {rootme.username}
                </p>
              </div>
            </div>

            {/* statistiques publiques */}
            <dl className="relative mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.04] sm:grid-cols-3">
              {rootme.stats?.map((stat) => (
                <div key={stat.label} className="bg-void/90 px-5 py-5 text-center transition-colors duration-300 hover:bg-elev/70 sm:text-left">
                  <dd className="font-mono text-2xl font-semibold text-bone sm:text-3xl">
                    {stat.value}
                  </dd>
                  <dt className="mt-1 font-mono text-[0.62rem] uppercase tracking-widest2 text-dim">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>

            <div className="relative mt-8 grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div>
                <p className="label">visible categories</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {rootme.categories?.map((category) => (
                    <li key={category} className="chip hover:border-alert/40">
                      {category}
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <MagneticButton href={rootme.url} external variant="primary">
                    {rootme.cta}
                    <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </MagneticButton>
                </div>
              </div>

              <div className="min-w-0">
                <p className="label">notable challenges solved</p>
                <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {rootme.challenges?.map((challenge) => (
                    <li
                      key={challenge}
                      className="flex items-start gap-2 font-mono text-[0.7rem] leading-relaxed text-muted transition-colors hover:text-bone"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ok/70"
                        aria-hidden="true"
                      />
                      {challenge}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </Reveal>

        {/* ------------------------------- TRYHACKME + HACK THE BOX (registre) */}
        {/* Deux lignes de même structure : identité à gauche, chiffres au centre,
            action à droite. Aucune grille imbriquée, donc aucun trou
            quand une plateforme a un nombre impair de chiffres. */}
        <Reveal className="mt-6">
          <ul className="panel divide-y divide-white/[0.07] overflow-hidden">
            {others.map((platform) => {
              const stats = platform.stats
              return (
                <li
                  key={platform.id}
                  className="group relative px-6 py-7 transition-colors duration-300 hover:bg-white/[0.012] sm:px-8"
                >
                  <div className="grid gap-7 xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] xl:items-center xl:gap-10">
                    {/* identité */}
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-white/[0.09] bg-white/[0.02] text-bone transition-colors group-hover:border-signal/35">
                        <BrandIcon name={platform.icon} className="h-6 w-6" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-mono text-base text-bone">{platform.name}</h3>
                        <p className="mt-1 font-mono text-[0.66rem] uppercase tracking-widest2 text-signal-soft/80">
                          {platform.username}
                        </p>
                        {platform.rank ? (
                          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.58rem] uppercase leading-snug tracking-widest2 text-dim">
                            {platform.rankBadge ? (
                              <img
                                src={platform.rankBadge}
                                alt=""
                                aria-hidden="true"
                                width={25}
                                height={22}
                                className="h-[22px] w-auto shrink-0"
                              />
                            ) : (
                              <span>rank</span>
                            )}
                            <span className="text-alert-soft">{platform.rank}</span>
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* chiffres */}
                    {stats ? (
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4 xl:gap-x-8">
                        {stats.map((stat) => (
                          <div key={stat.label} className="min-w-0">
                            <dd className="font-mono text-lg font-semibold text-bone sm:text-xl">
                              {stat.value}
                            </dd>
                            <dt className="mt-1 font-mono text-[0.55rem] uppercase leading-tight tracking-widest2 text-dim">
                              {stat.label}
                            </dt>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="flex items-start gap-2 font-mono text-[0.64rem] leading-relaxed text-dim">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {platformsMeta.noStatsNote}
                      </p>
                    )}

                    {/* action */}
                    <div className="xl:justify-self-end">
                      <MagneticButton href={platform.url} external variant="ghost">
                        {platform.cta}
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </MagneticButton>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Reveal>

        {/* ------------------------------------------------ prochaines échéances */}
        <Reveal>
          <div className="mt-10">
            <div className="flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-widest2 text-dim">
              <span className="text-signal">// next operations</span>
              <span aria-hidden="true" className="h-px flex-1 bg-white/[0.07]" />
            </div>

            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {nextOps.map((op) => (
                <li key={op.id} className="panel corners relative p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="tag-signal">{op.badge}</span>
                    <span aria-hidden="true" className="font-mono text-[0.6rem] text-dim/70">
                      soon
                    </span>
                  </div>
                  <h3 className="mt-4 font-mono text-[0.74rem] uppercase tracking-widest2 text-bone">
                    {op.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{op.note}</p>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal>
          <p className="mt-8 font-mono text-[0.62rem] leading-relaxed text-dim">
            // platform figures shown here were captured from the public profiles at the time this
            site was built — not a live feed. Open a profile for current numbers.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

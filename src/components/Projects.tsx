import { ArrowUpRight, ShieldAlert } from 'lucide-react'
import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import { projects, projectsMeta } from '../data/projects'
import Spotlight from './ui/Spotlight'

export default function Projects() {
  const [featured, ...rest] = projects

  return (
    <section data-spot="projects" id="projects" className="section scroll-mt-24">
      <Spotlight
        tone="signal"
        intensity="low"
        className="right-[-12rem] top-[4rem] h-[40rem] w-[40rem]"
      />

      <div className="shell">
        <SectionHeading
          title={projectsMeta.title}
        />

        {/* projet mis en avant */}
        <Reveal className="mt-14">
          <article className="group card corners relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-center">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-sm bg-[radial-gradient(70%_120%_at_100%_0%,rgb(var(--signal)/0.12),transparent_60%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div className="relative min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="tag-signal">
                  featured
                </span>
                <span className="font-mono text-[0.62rem] uppercase tracking-widest2 text-dim">
                  {featured.category}
                </span>
              </div>

              <h3 className="mt-4 text-2xl font-semibold text-gradient sm:text-3xl">
                {featured.name}
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                {featured.description}
              </p>

              <ul className="mt-5 flex flex-wrap gap-2">
                {featured.tech?.map((tech) => (
                  <li key={tech} className="chip">
                    {tech}
                  </li>
                ))}
              </ul>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <MagneticButton href={featured.url} external={featured.url.startsWith('https://')} variant="primary">
                  {featured.cta}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </MagneticButton>
                {featured.disclaimer ? (
                  <p className="flex items-center gap-2 font-mono text-[0.62rem] text-dim">
                    <ShieldAlert className="h-3.5 w-3.5 text-warm/70" aria-hidden="true" />
                    {featured.disclaimer}
                  </p>
                ) : null}
              </div>
            </div>

            {/* mini "device" décoratif — ESP32 / web UI */}
            <div className="relative hidden lg:block">
              <div className="term-window">
                <div className="term-titlebar">
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    <span className="term-dot bg-alert/70" />
                    <span className="term-dot bg-warm/60" />
                    <span className="term-dot bg-ok/50" />
                  </span>
                  <span className="font-mono text-[0.65rem] text-muted">evilfox / web-ui</span>
                </div>
                <pre className="overflow-x-auto px-4 py-3 font-mono text-[0.65rem] leading-relaxed text-muted sm:text-[0.7rem]">
{`> interface  : esp32 web console
> modules    : wifi scan · firmware
> status     : research build
> access     : authorized use only`}
                </pre>
              </div>
            </div>
          </article>
        </Reveal>

        {/* autres projets */}
        <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((project, index) => (
            <Reveal as="li" key={project.slug} delay={index * 0.05} className="group card p-5 sm:p-6">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-signal/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden="true" />
              </div>

              <h3 className="mt-4 font-mono text-base font-semibold text-bone transition-colors group-hover:text-white">
                {project.name}
              </h3>
              <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-widest2 text-signal-soft/70">
                {project.category}
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted">{project.description}</p>

              {project.tech?.length ? (
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {project.tech.map((tech) => (
                    <li key={tech} className="chip">
                      {tech}
                    </li>
                  ))}
                </ul>
              ) : null}

              <a
                href={project.url}
                target={project.url.startsWith('https://') ? '_blank' : undefined}
                rel={project.url.startsWith('https://') ? 'noopener noreferrer' : undefined}
                className="mt-6 inline-flex min-h-[44px] items-center gap-2 font-mono text-[0.68rem] uppercase tracking-widest2 text-muted transition-colors hover:text-bone"
              >
                {project.cta ?? 'VIEW PROJECT →'}
                <ArrowUpRight
                  className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </a>
            </Reveal>
          ))}
        </ul>

        <Reveal className="mt-10 flex flex-col items-center gap-3">
          <MagneticButton href={projectsMeta.viewAll.href} external variant="ghost">
            {projectsMeta.viewAll.label}
          </MagneticButton>
        </Reveal>
      </div>
    </section>
  )
}

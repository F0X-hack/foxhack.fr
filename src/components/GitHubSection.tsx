import { ArrowUpRight } from 'lucide-react'
import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import BrandIcon from './icons/BrandIcon'
import MagneticButton from './ui/MagneticButton'
import { profile } from '../data/profile'
import { projects } from '../data/projects'

export default function GitHubSection() {
  /* Seuls les dépôts hébergés sur GitHub : EvilFoX, Reaper et FoX-HID ont leur
     propre site, ils sont racontés une fois, plus haut, dans ~/projects. */
  const repos = projects.filter((project) => project.url.includes('github.com'))

  return (
    <section id="github" className="section scroll-mt-24 pt-0">
      <div className="shell">
        <SectionHeading
          title="GITHUB"
        />

        <Reveal className="mt-12">
          <div className="panel relative overflow-hidden p-6 sm:p-8">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_0%_0%,rgb(var(--bone)/0.05),transparent_60%)]"
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-white/[0.09] bg-white/[0.02] text-bone">
                  <BrandIcon name="github" className="h-7 w-7" />
                </span>
                <div className="min-w-0">
                  <p className="font-mono text-sm text-bone sm:text-base">
                    {profile.github.username}
                  </p>
                  <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-widest2 text-signal-soft/80">
                    {profile.github.role}
                  </p>
                  <a
                    href={profile.github.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block font-mono text-[0.66rem] text-muted underline decoration-white/15 underline-offset-2 transition-colors hover:text-bone"
                  >
                    github.com/{profile.github.username}
                  </a>
                </div>
              </div>

              <MagneticButton href={profile.github.url} external variant="ghost">
                VIEW GITHUB →
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </MagneticButton>
            </div>
          </div>
        </Reveal>

        {/* inventaire des dépôts — l'histoire de chaque projet est déjà
            racontée dans ~/projects, ici on dit seulement ce qui est en ligne */}
        <Reveal className="mt-6">
          <div className="panel p-6 sm:p-8">
            <ul className="mt-4 divide-y divide-white/[0.05]">
              {repos.map((repo) => (
                <li key={repo.slug}>
                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-[44px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 transition-colors"
                  >
                    <span className="font-mono text-sm text-bone transition-colors group-hover:text-white">
                      ~/{repo.name.toLowerCase()}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-widest2 text-dim transition-colors group-hover:text-bone">
                      {repo.category}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

      </div>
    </section>
  )
}

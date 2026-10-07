import { Code2, Cpu, Crosshair, Flag, Globe2, Network, Server, Target } from 'lucide-react'
import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import { skillGroups, skillsMeta, type SkillGroup } from '../data/skills'
import Spotlight from './ui/Spotlight'

const ICONS: Record<SkillGroup['icon'], typeof Target> = {
  target: Target,
  globe: Globe2,
  flag: Flag,
  code: Code2,
  cpu: Cpu,
  crosshair: Crosshair,
  server: Server,
  network: Network,
}

/**
 * Accents volontairement limités à deux tons : l'accent principal (signal) et
 * un froid secondaire (static). Les autres entrées existent pour les cas
 * d'alerte, jamais pour décorer.
 */
const ACCENTS: Record<SkillGroup['accent'], { text: string; ring: string; glow: string }> = {
  signal: { text: 'text-signal-soft', ring: 'hover:border-signal/45', glow: 'from-signal/[0.1]' },
  static: { text: 'text-static', ring: 'hover:border-static/40', glow: 'from-static/[0.07]' },
  warm: { text: 'text-warm', ring: 'hover:border-warm/40', glow: 'from-warm/[0.07]' },
  alert: { text: 'text-alert-soft', ring: 'hover:border-alert/45', glow: 'from-alert/[0.08]' },
  ok: { text: 'text-ok', ring: 'hover:border-ok/40', glow: 'from-ok/[0.07]' },
}

export default function Skills() {
  return (
    <section data-spot="skills" id="skills" className="section scroll-mt-24">
      <Spotlight
        tone="static"
        intensity="low"
        className="left-1/2 top-[-6rem] h-[30rem] w-[52rem] -translate-x-1/2"
      />

      <div className="shell">
        <SectionHeading
          title={skillsMeta.title}
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skillGroups.map((group, index) => {
            const Icon = ICONS[group.icon]
            const accent = ACCENTS[group.accent]
            return (
              <Reveal
                as="li"
                key={group.id}
                delay={index * 0.05}
                className={`group card corners relative p-5 sm:p-6 ${accent.ring} ${
                  group.wide ? 'sm:col-span-2' : ''
                }`}
              >
                {/* halo au hover */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute -inset-px rounded-sm bg-gradient-to-br ${accent.glow} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`}
                />
                {/* ligne de scan */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px overflow-hidden"
                >
                  <span className="block h-px w-1/3 animate-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </span>

                <div className="relative flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-[2px] border border-white/[0.08] bg-white/[0.02] ${accent.text} transition-transform duration-500 group-hover:-rotate-6`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h3 className="font-mono text-[0.72rem] uppercase tracking-widest2 text-bone sm:text-xs">
                    {group.title}
                  </h3>
                </div>

                {group.layout === 'chips' ? (
                  <ul className="relative mt-5 flex flex-wrap gap-1.5">
                    {group.items.map((item) => (
                      <li key={item} className="chip px-2.5 py-1">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="relative mt-5 space-y-2">
                    {group.items.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 font-mono text-[0.72rem] text-muted transition-all duration-300 hover:translate-x-1 hover:text-bone sm:text-[0.78rem]"
                      >
                        <span className={`select-none ${accent.text} opacity-70`} aria-hidden="true">
                          ▸
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                {group.note && (
                  <p className="relative mt-5 pr-8 font-mono text-[0.6rem] leading-relaxed text-dim/80">
                    {group.note}
                  </p>
                )}

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 right-4 font-mono text-[0.6rem] text-dim/60"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              </Reveal>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

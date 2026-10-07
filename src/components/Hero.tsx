import { motion, useReducedMotion, type MotionProps } from 'framer-motion'
import { ArrowDown, ArrowUpRight } from 'lucide-react'
import ProfileAvatar from './ui/ProfileAvatar'
import MagneticButton from './ui/MagneticButton'
import BrandMark from './icons/BrandMark'
import { profile } from '../data/profile'
import Spotlight from './ui/Spotlight'

/**
 * Hero — « accès au canal » : bandeau de statut, nom en wordmark (glitch froid),
 * rôle, sous-titre, CTA et dossier latéral (portrait + repères).
 * Structure imposée respectée : [ ● ONLINE ] → FoXhack → OFFENSIVE / SECURITY /
 * RESEARCHER → sous-titre → CTA.
 * Depuis le retrait de la console, la carte d'identité (LOCATION / AGE / ALIAS /
 * STATUS) vit dans la section whoami — un fait ne s'affiche qu'à un endroit.
 */
export default function Hero() {
  const reduceMotion = useReducedMotion()
  const hero = profile.hero

  const stagger = (index: number): MotionProps =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay: 0.07 * index, ease: [0.22, 1, 0.36, 1] },
        }

  return (
    <section data-spot="top" id="top" className="hero-top relative overflow-hidden pb-16 lg:pb-24">
      {/* projecteur du hero : derrière le portrait et le wordmark */}
      <Spotlight
        tone="signal"
        intensity="low"
        className="right-[-10rem] top-[6rem] h-[42rem] w-[42rem]"
      />

      <div className="shell">
        <div className="mt-12 grid items-start gap-12 lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)] lg:gap-14">
          {/* -------------------------------------------------------- colonne A */}
          <div className="min-w-0">
            <motion.h1 {...stagger(2)} className="w-full max-w-[40rem]">
              {/* Le titre du hero est le wordmark dessiné (vectoriel, masque CSS).
                  Le SVG est décoratif : le texte du h1, lu par les moteurs et les
                  lecteurs d'écran, reste complet et descriptif. */}
              <span className="sr-only">
                {profile.name} — {profile.title}
              </span>
              <BrandMark
                variant="wordmark"
                className="brand-mark--glitch w-full text-bone"
              />
            </motion.h1>

            <motion.div {...stagger(3)} className="mt-7">
              <span aria-hidden="true" className="mb-6 block h-px w-24 bg-signal/60" />
              <p className="display text-[clamp(1.3rem,4.6vw,2.5rem)]" aria-label={profile.title}>
                <span className="block text-bone/95">{hero.lines[0]}</span>
                <span className="block text-outline">{hero.lines[1]}</span>
                <span className="block text-signal-soft">{hero.lines[2]}</span>
              </p>
            </motion.div>

            <motion.div {...stagger(4)} className="mt-8 max-w-xl border-l border-white/[0.12] pl-4">
              {hero.subtitle.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-muted sm:text-base">
                  {line}
                </p>
              ))}
            </motion.div>

            <motion.div {...stagger(5)} className="mt-9 flex flex-wrap items-center gap-3">
              <MagneticButton href={hero.primaryCta.href} variant="primary">
                <span aria-hidden="true">[</span>
                {hero.primaryCta.label}
                <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">]</span>
              </MagneticButton>
              <MagneticButton href={hero.secondaryCta.href} variant="ghost">
                <span aria-hidden="true">[</span>
                {hero.secondaryCta.label}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                <span aria-hidden="true">]</span>
              </MagneticButton>
            </motion.div>

          </div>

          {/* -------------------------------------------------------- colonne B */}
          <motion.aside {...stagger(4)} className="relative min-w-0">
            <div className="flex flex-col items-center gap-6">
              <ProfileAvatar size="lg" priority variant="hero" />

              <div className="flex w-full max-w-xs flex-wrap justify-center gap-2">
                <span className="sticker rotate-1">ctf player</span>
                <span className="sticker -rotate-1">root-me · hackthebox</span>
                <span className="sticker rotate-1">tryhackme</span>
              </div>

            </div>
          </motion.aside>
        </div>

      </div>
    </section>
  )
}

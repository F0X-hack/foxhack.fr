import { useReducedMotion } from 'framer-motion'
import { profile } from '../../data/profile'

/**
 * Portrait — traité comme un moniteur : anneaux fins contre-rotatifs, statique
 * très légère, et glitch froid : une tranche teintée se décale par salves
 * automatiques, plus franches au survol.
 * Aucune déformation : ratio 1:1, object-cover.
 * Deux emplacements, deux portraits (voir src/data/profile.ts) :
 *   variant="hero"  → hero, à côté du nom   (profile.avatarHero)
 *   variant="about" → section « who am i »  (profile.avatar)
 */
export default function ProfileAvatar({
  size = 'lg',
  className = '',
  priority = false,
  variant = 'about',
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  /** true → image chargée immédiatement (portrait du hero) */
  priority?: boolean
  /** quel portrait afficher : celui du hero ou celui du whoami */
  variant?: 'hero' | 'about'
}) {
  const reduceMotion = useReducedMotion()
  const isHero = variant === 'hero'
  const src = isHero ? profile.avatarHero : profile.avatar
  const alt = isHero ? profile.avatarHeroAlt : profile.avatarAlt

  const dims = {
    sm: 'h-11 w-11',
    md: 'h-20 w-20 sm:h-24 sm:w-24',
    lg: 'h-44 w-44 sm:h-52 sm:w-52 lg:h-60 lg:w-60',
  }[size]


  return (
    <div className={`group relative shrink-0 ${className}`}>
      {/* halo très discret (suit le thème) */}
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgb(var(--signal)/0.14),transparent_66%)] blur-2xl"
      />

      {/* anneaux + graduations */}
      <svg
        aria-hidden="true"
        viewBox="0 0 120 120"
        className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)] text-bone/25"
      >
        <circle
          cx="60"
          cy="60"
          r="58"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeDasharray="2 6"
          className={reduceMotion ? '' : 'animate-spin-slower'}
          style={{ transformOrigin: '60px 60px' }}
        />
        <circle cx="60" cy="60" r="53" fill="none" stroke="rgb(var(--signal)/0.5)" strokeWidth="0.6" strokeDasharray="30 46" className={reduceMotion ? '' : 'animate-spin-slow'} style={{ transformOrigin: '60px 60px' }} />
      </svg>

      <div
        className={`relative overflow-hidden rounded-full border border-white/[0.14] bg-ink ${dims}`}
        style={{ '--pdp-src': `url(${src})` } as React.CSSProperties}
      >
        {/* le portrait et ses copies glitch partagent le même cadre : elles
            restent alignées pendant le zoom au survol */}
        <div className="absolute inset-0 transition-transform duration-700 will-change-transform group-hover:scale-[1.02]">
          <img
            src={src}
            alt={alt}
            width={512}
            height={512}
            loading={priority ? 'eager' : 'lazy'}
            /* React 18 attend la casse DOM ('fetchpriority') */
            {...{ fetchpriority: priority ? 'high' : 'auto' }}
            decoding="async"
            className="h-full w-full object-cover object-center"
          />

          {/* glitch froid : salves automatiques, accélérées au survol */}
          {!reduceMotion ? <span aria-hidden="true" className="pdp-glitch" /> : null}
        </div>

        {/* statique / entrelacement au-dessus du portrait */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(to_bottom,rgba(255,255,255,0.045)_0px,rgba(255,255,255,0.045)_1px,transparent_1px,transparent_3px)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgb(var(--void)/0.85),transparent_60%)]"
        />
      </div>

      {/* Pas de légende de dossier ici : `profile.status` est une case de la
          fiche technique du hero, et le badge sous le portrait en faisait une
          deuxième copie dans le même écran (et une troisième dans whoami). */}
    </div>
  )
}

/**
 * Spotlight — cône de lumière derrière une section.
 *
 * Purement décoratif (masqué aux lecteurs d'écran) et statique : un dégradé
 * radial, aucun filtre de flou, donc quasiment gratuit à peindre.
 * Il respire lentement (`breathe`), animation coupée par prefers-reduced-motion.
 *
 *   <Spotlight tone="signal" className="-right-24 top-10 h-[38rem] w-[38rem]" />
 *
 * Position et taille se règlent avec les classes Tailwind passées en `className`.
 *
 * ⚠️ Le ton est transmis par variable CSS inline, pas par une classe
 * `spotlight--${tone}` : Tailwind analyse le code source de façon statique et purgerait
 * une classe composée dynamiquement. Les classes littérales ci-dessous, elles,
 * sont bien détectées.
 */
const TONE_VAR = {
  signal: 'var(--signal)',
  static: 'var(--static)',
  alert: 'var(--alert)',
  warm: 'var(--warm)',
} as const

const INTENSITY_CLASS = {
  normal: '',
  low: 'spotlight--low',
  ambient: 'spotlight--ambient',
  core: 'spotlight--core',
} as const

export default function Spotlight({
  tone = 'signal',
  intensity = 'normal',
  drift = false,
  className = '',
}: {
  tone?: keyof typeof TONE_VAR
  /**
   * `normal` = cône standard · `low` = projecteur secondaire discret ·
   * `ambient` = fond global très doux · `core` = cœur net au-dessus d'un cône large
   */
  intensity?: keyof typeof INTENSITY_CLASS
  /** dérive lente du cône (96 s) — à réserver au fond, jamais aux sections */
  drift?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`spotlight ${INTENSITY_CLASS[intensity]} ${drift ? 'spotlight--drift' : ''} -z-10 ${className}`}
      style={{ '--spot-tone': TONE_VAR[tone] } as React.CSSProperties}
    />
  )
}

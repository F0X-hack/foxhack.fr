import { useRef, type ReactNode } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion'

type MagneticButtonProps = {
  children: ReactNode
  href?: string
  /** Force utilisée pour l'attraction (px) — volontairement très légère */
  strength?: number
  variant?: 'primary' | 'ghost' | 'plain'
  className?: string
  external?: boolean
  onClick?: () => void
  ariaLabel?: string
}

/**
 * Bouton "magnétique" très léger : le contenu suit le curseur de quelques px.
 * Cible tactile ≥ 44px, focus clavier natif conservé.
 */
export default function MagneticButton({
  children,
  href,
  strength = 5,
  variant = 'primary',
  className = '',
  external,
  onClick,
  ariaLabel,
}: MagneticButtonProps) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLElement | null>(null)
  const rawX = useMotionValue(0)
  const rawY = useMotionValue(0)
  const x = useSpring(rawX, { stiffness: 220, damping: 18, mass: 0.4 })
  const y = useSpring(rawY, { stiffness: 220, damping: 18, mass: 0.4 })

  const handleMove = (event: React.MouseEvent) => {
    if (reduceMotion) return
    const node = ref.current
    if (!node) return
    const rect = node.getBoundingClientRect()
    const relX = (event.clientX - rect.left) / rect.width - 0.5
    const relY = (event.clientY - rect.top) / rect.height - 0.5
    rawX.set(relX * strength * 2)
    rawY.set(relY * strength * 1.4)
  }

  const reset = () => {
    rawX.set(0)
    rawY.set(0)
  }

  const variantClass =
    variant === 'primary' ? 'btn btn-primary' : variant === 'ghost' ? 'btn btn-ghost' : 'btn'

  const content = (
    <motion.span style={{ x, y }} className="inline-flex items-center gap-2">
      {children}
    </motion.span>
  )

  if (href) {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        aria-label={ariaLabel}
        onClick={onClick}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className={`${variantClass} ${className}`}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={`${variantClass} ${className}`}
    >
      {content}
    </button>
  )
}

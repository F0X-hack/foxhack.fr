/** Niveau de « signal » ▓▓▓▓░ — détail d'interface récurrent, purement décoratif. */
export default function SignalBars({
  level = 4,
  total = 5,
  className = '',
  label = 'signal',
}: {
  level?: number
  total?: number
  className?: string
  label?: string
}) {
  return (
    <span className={`bars ${className}`} role="img" aria-label={`${label}: ${level}/${total}`}>
      {Array.from({ length: total }, (_, index) => (
        <i key={index} data-on={index < level ? 'true' : 'false'} />
      ))}
    </span>
  )
}

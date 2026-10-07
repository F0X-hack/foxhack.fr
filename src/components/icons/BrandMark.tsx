import { GLYPH } from './brandPaths'

/**
 * BrandMark — identité FoXhack.
 *
 *   <BrandMark variant="wordmark" />  « FoXhack » dessiné, en-têtes
 *   <BrandMark variant="glyph" />     le Ⓧ (O barré), usages compacts
 *
 * Le wordmark est un SVG externe (`/brand/foxhack-wordmark.svg`) appliqué en
 * masque CSS : il est mis en cache par le navigateur, ne pèse rien dans le
 * bundle JS, et prend quand même la couleur du thème (`currentColor`).
 * Le glyphe, plus léger, reste inline pour rester net même sans masque CSS.
 *
 * Les deux sont générés par `python3 scripts/make_brand.py`.
 */
export default function BrandMark({
  variant = 'wordmark',
  className = '',
  title,
}: {
  variant?: 'wordmark' | 'glyph'
  className?: string
  /** Libellé accessible ; sans lui, la marque est décorative */
  title?: string
}) {
  if (variant === 'glyph') {
    return (
      <svg
        viewBox={GLYPH.viewBox}
        className={className}
        role={title ? 'img' : 'presentation'}
        aria-hidden={title ? undefined : true}
        focusable="false"
        fill="currentColor"
        preserveAspectRatio="xMidYMid meet"
      >
        {title ? <title>{title}</title> : null}
        <path d={GLYPH.path} fillRule="evenodd" clipRule="evenodd" />
      </svg>
    )
  }

  return (
    <span
      className={`brand-mark brand-mark--wordmark ${className}`}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    />
  )
}

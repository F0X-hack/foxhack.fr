import { Crosshair } from 'lucide-react'
import {
  brandGitHub,
  brandHackTheBox,
  brandInstagram,
  brandRootMe,
  brandTikTok,
  brandTryHackMe,
} from './brandMarks'
import BrandMark from './BrandMark'
import type { SocialIconKey } from '../../data/socials'

function FilledMark({
  path,
  title,
  className,
}: {
  path: string
  title: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      role="img"
      aria-label={title}
      focusable="false"
      fill="currentColor"
    >
      <title>{title}</title>
      <path d={path} />
    </svg>
  )
}

/**
 * Icônes officielles (Simple Icons) rendues en monochrome currentColor,
 * avec la griffe FoXhack pour les marques maison.
 */
export default function BrandIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: SocialIconKey
  className?: string
}) {
  switch (name) {
    case 'github':
      return <FilledMark path={brandGitHub.path} title="GitHub" className={className} />
    case 'instagram':
      return <FilledMark path={brandInstagram.path} title="Instagram" className={className} />
    case 'tiktok':
      return <FilledMark path={brandTikTok.path} title="TikTok" className={className} />
    case 'rootme':
      return <FilledMark path={brandRootMe.path} title="Root-Me" className={className} />
    case 'tryhackme':
      return <FilledMark path={brandTryHackMe.path} title="TryHackMe" className={className} />
    case 'hackthebox':
      return <FilledMark path={brandHackTheBox.path} title="Hack The Box" className={className} />
    case 'guns':
      /* guns.lol — pas de marque officielle libre : réticule discret */
      return <Crosshair className={className} aria-label="Guns.lol" role="img" />
    case 'evilfox':
      return <BrandMark variant="glyph" className={className} title="EvilFoX" />
    default:
      return null
  }
}

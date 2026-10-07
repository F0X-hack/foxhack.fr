export type VaultGroup = 'Accueil' | 'Guides' | 'Techniques' | 'Outils' | 'Templates'

export type VaultHeading = {
  depth: number
  text: string
  slug: string
}

export type VaultLink = {
  id: string
  hash: string
}

/* `outline.json` : le plan d'une note, chargé en arrière-plan après le premier
   rendu. Les titres sont stockés `[profondeur, texte]` et l'ancre est
   recalculée côté lecteur (voir `expandHeadings`). */
export type VaultOutlineEntry = {
  headings?: [number, string][]
  properties?: Record<string, string>
}

export type VaultOutline = Record<string, VaultOutlineEntry>

export type VaultNote = {
  id: string
  path: string
  name: string
  title: string
  folder: string
  group: VaultGroup
  type: string
  category: string
  tags: string[]
  status: string
  excerpt: string
  words: number
  readTime: number
  modified: string
  links: VaultLink[]
  backlinks: string[]
}

export type VaultManifest = {
  name: string
  description: string
  generatedAt: string
  defaultNote: string
  stats: {
    notes: number
    techniques: number
    tools: number
    guides: number
    assets: number
    links: number
  }
  groups: Record<VaultGroup, number>
  categories: Record<string, number>
  assets: string[]
  notes: VaultNote[]
}

export type VaultSearchIndex = Record<string, number[]>

export type OpenNote = (id: string, hash?: string, options?: { replace?: boolean }) => void

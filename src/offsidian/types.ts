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
  headings: VaultHeading[]
  words: number
  readTime: number
  modified: string
  properties: Record<string, string>
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

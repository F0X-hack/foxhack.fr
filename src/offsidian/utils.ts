import type { VaultManifest, VaultNote } from './types'

export const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\\\|/g, '|')
    .replace(/\.md$/i, '')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()

export const headingSlug = (value: string) =>
  normalizeSearch(value)
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

export const encodeVaultPath = (value: string) =>
  value
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/')

export const vaultFileUrl = (value: string) => `/offsidian/vault/${encodeVaultPath(value)}`

export function stripFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
}

export function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export function shortTitle(note: VaultNote) {
  return note.title.replace(/^Outil\s*-\s*/i, '').replace(/^Technique\s*-\s*/i, '')
}

export type VaultResolver = {
  noteById: Map<string, VaultNote>
  resolveNote: (current: VaultNote, target: string) => VaultNote | undefined
  resolveAsset: (current: VaultNote, target: string) => string | undefined
}

export function createVaultResolver(manifest: VaultManifest): VaultResolver {
  const noteById = new Map(manifest.notes.map((note) => [note.id, note]))
  const noteByPath = new Map<string, VaultNote>()
  const notesByBase = new Map<string, VaultNote[]>()

  for (const note of manifest.notes) {
    noteByPath.set(normalizeSearch(note.path.replace(/\.md$/i, '')), note)
    const base = normalizeSearch(note.name)
    notesByBase.set(base, [...(notesByBase.get(base) ?? []), note])
  }

  const assetByPath = new Map<string, string>()
  const assetsByBase = new Map<string, string[]>()
  for (const asset of manifest.assets) {
    assetByPath.set(normalizeSearch(asset), asset)
    const base = normalizeSearch(asset.split('/').at(-1) ?? asset)
    assetsByBase.set(base, [...(assetsByBase.get(base) ?? []), asset])
  }

  const resolveNote = (current: VaultNote, rawTarget: string) => {
    const target = normalizeSearch(rawTarget.replace(/^\/+/, ''))
    if (!target) return current
    const exact = noteByPath.get(target)
    if (exact) return exact

    const currentFolder = normalizeSearch(current.folder)
    const local = currentFolder ? noteByPath.get(`${currentFolder}/${target}`) : undefined
    if (local) return local

    const suffixMatches = [...noteByPath.entries()]
      .filter(([candidate]) => candidate === target || candidate.endsWith(`/${target}`))
      .map(([, note]) => note)
    if (suffixMatches.length === 1) return suffixMatches[0]

    const base = target.split('/').at(-1) ?? target
    const baseMatches = notesByBase.get(base) ?? []
    if (baseMatches.length === 1) return baseMatches[0]
    if (baseMatches.length > 1) {
      return baseMatches.find((note) => note.group === current.group) ?? baseMatches[0]
    }

    const stem = base.replace(/\s*\([^)]*\)\s*$/, '')
    if (stem !== base) {
      const fuzzyMatches = [...notesByBase.entries()]
        .filter(([candidate]) => candidate === stem || candidate.startsWith(`${stem} (`))
        .flatMap(([, matches]) => matches)
      if (fuzzyMatches.length === 1) return fuzzyMatches[0]
    }
    return undefined
  }

  const resolveAsset = (current: VaultNote, rawTarget: string) => {
    const target = normalizeSearch(rawTarget.split('|')[0].replace(/^\/+/, ''))
    if (!target) return undefined
    const exact = assetByPath.get(target)
    if (exact) return vaultFileUrl(exact)

    const currentFolder = normalizeSearch(current.folder)
    const local = currentFolder ? assetByPath.get(`${currentFolder}/${target}`) : undefined
    if (local) return vaultFileUrl(local)

    const suffixMatches = [...assetByPath.entries()]
      .filter(([candidate]) => candidate === target || candidate.endsWith(`/${target}`))
      .map(([, asset]) => asset)
    if (suffixMatches.length === 1) return vaultFileUrl(suffixMatches[0])

    const base = target.split('/').at(-1) ?? target
    const baseMatches = assetsByBase.get(base) ?? []
    return baseMatches.length ? vaultFileUrl(baseMatches[0]) : undefined
  }

  return { noteById, resolveNote, resolveAsset }
}

function splitWikiValue(value: string) {
  // Obsidian écrit `\\|` dans les tables Markdown pour préserver le séparateur
  // target/alias. Côté lecteur, on le traite donc comme un pipe normal.
  const unescapedValue = value.replace(/\\\|/g, '|')
  const divider = unescapedValue.indexOf('|')
  const targetWithHash = (divider >= 0 ? unescapedValue.slice(0, divider) : unescapedValue).trim()
  const label = (divider >= 0 ? unescapedValue.slice(divider + 1) : '').trim()
  const hashAt = targetWithHash.indexOf('#')
  return {
    target: (hashAt >= 0 ? targetWithHash.slice(0, hashAt) : targetWithHash).trim(),
    hash: (hashAt >= 0 ? targetWithHash.slice(hashAt + 1) : '').trim(),
    label,
  }
}

function escapeMarkdownLabel(value: string) {
  return value.replace(/([\[\]])/g, '\\$1').replace(/\|/g, '\\|')
}

/** Convertit les liens et embeds Obsidian en Markdown standard sans toucher aux blocs de code. */
export function prepareObsidianMarkdown(source: string, current: VaultNote, resolver: VaultResolver) {
  let fenced = false

  return stripFrontmatter(source)
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced
        return line
      }
      if (fenced) return line

      const transformSegment = (segment: string) =>
        segment
          .replace(/!\[\[([^\]]+)\]\]/g, (_, value: string) => {
            const { target, label } = splitWikiValue(value)
            const url = resolver.resolveAsset(current, target)
            const alt = label || target.split('/').at(-1) || 'Image du vault'
            return url
              ? `![${escapeMarkdownLabel(alt)}](${url})`
              : `\`${escapeMarkdownLabel(target)} — média introuvable\``
          })
          .replace(/\[\[([^\]]+)\]\]/g, (_, value: string) => {
            const { target, hash, label } = splitWikiValue(value)
            const note = resolver.resolveNote(current, target)
            const visible = escapeMarkdownLabel(label || target || hash || 'Lien interne')
            if (!note) return `[${visible}](#lien-introuvable)`
            const anchor = hash ? `#${headingSlug(hash)}` : ''
            return `[${visible}](/offsidian/?note=${encodeURIComponent(note.id)}${anchor})`
          })

      // Les backticks inline sont laissés intacts, comme les fences ci-dessus.
      return line
        .split(/(`+[^`]*`+)/g)
        .map((segment, index) => (index % 2 ? segment : transformSegment(segment)))
        .join('')
    })
    .join('\n')
}

export function isExternalUrl(value?: string) {
  return Boolean(value && /^(?:https?:)?\/\//i.test(value))
}

export function noteUrl(note: VaultNote, hash = '') {
  return `/offsidian/?note=${encodeURIComponent(note.id)}${hash ? `#${headingSlug(hash)}` : ''}`
}

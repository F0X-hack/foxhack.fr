import { createHash } from 'node:crypto'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vaultDir = path.join(root, 'public', 'offsidian', 'vault')
const outputDir = path.join(root, 'public', 'offsidian')

const posix = (value) => value.split(path.sep).join('/')
const withoutExtension = (value) => value.replace(/\.md$/i, '')
const stripQuotes = (value) => value.replace(/^(["'])(.*)\1$/, '$2').trim()

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\\\|/g, '|')
    .replace(/\.md$/i, '')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()

const slugify = (value) => {
  const slug = normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || createHash('sha1').update(value).digest('hex').slice(0, 10)
}

const headingSlug = (value) =>
  normalize(value)
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(fullPath)))
    else files.push(fullPath)
  }
  return files
}

function parseFrontmatter(source) {
  if (!source.startsWith('---\n') && !source.startsWith('---\r\n')) {
    return { data: {}, body: source }
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { data: {}, body: source }

  const data = {}
  let activeKey = ''
  for (const line of match[1].split(/\r?\n/)) {
    const keyMatch = line.match(/^([\p{L}\w_-]+):\s*(.*)$/u)
    if (keyMatch) {
      activeKey = keyMatch[1]
      data[activeKey] = keyMatch[2] ? stripQuotes(keyMatch[2]) : []
      continue
    }
    const itemMatch = line.match(/^\s+-\s+(.+)$/)
    if (itemMatch && activeKey) {
      if (!Array.isArray(data[activeKey])) data[activeKey] = []
      data[activeKey].push(stripQuotes(itemMatch[1]))
    }
  }

  return { data, body: source.slice(match[0].length) }
}

function outsideCodeLines(body) {
  let fenced = false
  return body.split(/\r?\n/).map((line) => {
    if (/^\s*```/.test(line)) {
      fenced = !fenced
      return ''
    }
    return fenced ? '' : line
  })
}

function cleanInline(value) {
  return value
    .replace(/!\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_, target, label) => label || target)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_~>#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractHeadings(lines) {
  const seen = new Map()
  return lines.flatMap((line) => {
    const match = line.match(/^(#{1,4})\s+(.+?)\s*#*$/)
    if (!match) return []
    const text = cleanInline(match[2])
    const base = headingSlug(text) || 'section'
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    return [{ depth: match[1].length, text, slug: occurrence ? `${base}-${occurrence}` : base }]
  })
}

function extractWikiTargets(lines) {
  const targets = []
  const matcher = /(?<!!)\[\[([^\]]+)\]\]/g
  for (const line of lines) {
    const segments = line.split(/(`+[^`]*`+)/g)
    for (let index = 0; index < segments.length; index += 2) {
      for (const match of segments[index].matchAll(matcher)) {
        // Dans un tableau Markdown, Obsidian échappe le séparateur d’alias (`\\|`).
        // Il reste bien un séparateur de wikilink, pas un caractère du nom de fichier.
        const inside = match[1].replace(/\\\|/g, '|')
        const [rawTarget] = inside.split('|')
        const [target, hash = ''] = rawTarget.split('#')
        if (target.trim()) targets.push({ target: target.trim(), hash: hash.trim() })
      }
    }
  }
  return targets
}

function getGroup(relativePath) {
  if (relativePath === 'Sommaire.md') return 'Accueil'
  if (relativePath.startsWith('Templates/')) return 'Templates'
  if (relativePath.includes('/Techniques/')) return 'Techniques'
  if (relativePath.includes('/Outils/')) return 'Outils'
  return 'Guides'
}

function makeExcerpt(lines) {
  const candidates = lines
    .map((line) => line.replace(/^\s*>\s?(?:\[![^\]]+\]\s*)?/, '').replace(/^\s*[-*+]\s+/, ''))
    .map(cleanInline)
    .filter((line) => line.length >= 45 && !/^[-:|\s]+$/.test(line))
  const excerpt = candidates[0] || 'Note du vault Offsidian.'
  return excerpt.length > 220 ? `${excerpt.slice(0, 217).trim()}…` : excerpt
}

const stopWords = new Set(
  'avec dans pour une des les est sur que qui par pas plus cette sont comme aux ou du de la le un en et se au ce ces son sa ses leur leurs il elle on nous vous ils elles ne mais donc car si tout tous toute toutes afin vers entre depuis sans sous chez puis ainsi avoir etre fait faire peut aussi tres chaque quand comment pourquoi where from into true false null const let var return function'.split(
    ' ',
  ),
)

function tokenize(value) {
  return new Set(
    normalize(value)
      .replace(/https?:\/\/\S+/g, ' ')
      .split(/[^a-z0-9+#.-]+/)
      .map((token) => token.replace(/^[.+-]+|[.+-]+$/g, ''))
      .filter(
        (token) =>
          token.length >= 3 &&
          token.length <= 48 &&
          !/^\d+$/.test(token) &&
          !stopWords.has(token),
      ),
  )
}

const allFiles = await walk(vaultDir)
const markdownFiles = allFiles.filter((file) => file.toLowerCase().endsWith('.md')).sort((a, b) => a.localeCompare(b, 'fr'))
const assetFiles = allFiles.filter((file) => !file.toLowerCase().endsWith('.md')).sort((a, b) => a.localeCompare(b, 'fr'))

const notes = []
const claimedIds = new Set()
const tokenSets = []

for (const file of markdownFiles) {
  const source = await readFile(file, 'utf8')
  const fileStat = await stat(file)
  const relativePath = posix(path.relative(vaultDir, file))
  const fileName = path.basename(file, '.md')
  const { data, body } = parseFrontmatter(source)
  const lines = outsideCodeLines(body)
  const headings = extractHeadings(lines)
  const firstH1 = headings.find((heading) => heading.depth === 1)?.text
  const title = String(data.title || firstH1 || fileName)
  const group = getGroup(relativePath)

  let id = relativePath === 'Sommaire.md' ? 'sommaire' : relativePath.endsWith('/Cybersécurité Offensive.md') ? 'index' : slugify(title)
  if (claimedIds.has(id)) id = `${slugify(group)}-${id}`
  let suffix = 2
  const baseId = id
  while (claimedIds.has(id)) id = `${baseId}-${suffix++}`
  claimedIds.add(id)

  const tags = Array.isArray(data.tags) ? data.tags : data.tags ? [String(data.tags)] : []
  const category = String(data.categorie || data.category || (group === 'Guides' ? 'guide' : group.toLocaleLowerCase('fr')))
  const plainBody = cleanInline(lines.join('\n'))
  const wordCount = plainBody ? plainBody.split(/\s+/).length : 0
  const rawProperties = Object.fromEntries(
    Object.entries(data).filter(([key, value]) => !['title', 'tags', 'categorie', 'category'].includes(key) && !Array.isArray(value)),
  )

  notes.push({
    id,
    path: relativePath,
    name: fileName,
    title,
    folder: posix(path.dirname(relativePath)) === '.' ? '' : posix(path.dirname(relativePath)),
    group,
    type: String(data.type || (group === 'Outils' ? 'outil' : group === 'Techniques' ? 'technique' : 'note')),
    category,
    tags,
    status: String(data.statut || 'publie'),
    excerpt: makeExcerpt(lines),
    headings,
    words: wordCount,
    readTime: Math.max(1, Math.round(wordCount / 220)),
    modified: fileStat.mtime.toISOString(),
    properties: rawProperties,
    rawLinks: extractWikiTargets(lines),
    links: [],
    backlinks: [],
  })
  tokenSets.push(tokenize(`${title}\n${tags.join(' ')}\n${category}\n${plainBody}`))
}

const byPath = new Map()
const byBase = new Map()
for (const note of notes) {
  const pathKey = normalize(withoutExtension(note.path))
  byPath.set(pathKey, note)
  const baseKey = normalize(note.name)
  const matches = byBase.get(baseKey) || []
  matches.push(note)
  byBase.set(baseKey, matches)
}

function resolveTarget(sourceNote, rawTarget) {
  const target = normalize(rawTarget.replace(/^\/+/, ''))
  if (!target) return undefined
  if (byPath.has(target)) return byPath.get(target)

  const currentFolder = normalize(sourceNote.folder)
  if (currentFolder) {
    const local = `${currentFolder}/${target}`
    if (byPath.has(local)) return byPath.get(local)
  }

  const suffixMatches = [...byPath.entries()]
    .filter(([candidate]) => candidate === target || candidate.endsWith(`/${target}`))
    .map(([, note]) => note)
  if (suffixMatches.length === 1) return suffixMatches[0]

  const base = target.split('/').at(-1)
  const baseMatches = byBase.get(base) || []
  if (baseMatches.length === 1) return baseMatches[0]
  if (baseMatches.length > 1) {
    const sameGroup = baseMatches.find((note) => note.group === sourceNote.group)
    return sameGroup || baseMatches[0]
  }

  // Tolère un ancien intitulé dont seule la précision entre parenthèses a changé
  // (ex. « RFID LF (125 kHz) » → « RFID LF (HID, EM410X…) »).
  const stem = base.replace(/\s*\([^)]*\)\s*$/, '')
  if (stem !== base) {
    const fuzzyMatches = [...byBase.entries()]
      .filter(([candidate]) => candidate === stem || candidate.startsWith(`${stem} (`))
      .flatMap(([, matches]) => matches)
    if (fuzzyMatches.length === 1) return fuzzyMatches[0]
  }
  return undefined
}

for (const note of notes) {
  const seen = new Set()
  note.links = note.rawLinks.flatMap(({ target, hash }) => {
    const resolved = resolveTarget(note, target)
    if (!resolved) return []
    const key = `${resolved.id}#${hash}`
    if (seen.has(key)) return []
    seen.add(key)
    return [{ id: resolved.id, hash: hash ? headingSlug(hash) : '' }]
  })
  delete note.rawLinks
}

const noteById = new Map(notes.map((note) => [note.id, note]))
for (const note of notes) {
  for (const link of note.links) {
    const target = noteById.get(link.id)
    if (target && !target.backlinks.includes(note.id)) target.backlinks.push(note.id)
  }
}

const groupOrder = { Accueil: 0, Guides: 1, Techniques: 2, Outils: 3, Templates: 4 }
notes.sort((a, b) => {
  const groupDifference = groupOrder[a.group] - groupOrder[b.group]
  if (groupDifference) return groupDifference
  return a.name.localeCompare(b.name, 'fr', { numeric: true, sensitivity: 'base' })
})

const sortedTokenSets = notes.map((note) => tokenSets[markdownFiles.findIndex((file) => posix(path.relative(vaultDir, file)) === note.path)])
const searchIndex = Object.create(null)
for (let index = 0; index < notes.length; index += 1) {
  for (const token of sortedTokenSets[index]) {
    if (!searchIndex[token]) searchIndex[token] = []
    searchIndex[token].push(index)
  }
}

const assets = assetFiles.map((file) => posix(path.relative(vaultDir, file)))
const categories = notes.reduce((result, note) => {
  result[note.category] = (result[note.category] || 0) + 1
  return result
}, {})
const groups = notes.reduce((result, note) => {
  result[note.group] = (result[note.group] || 0) + 1
  return result
}, {})

const manifest = {
  name: 'Offsidian',
  description: 'Le vault public de FoXhack — notes de cybersécurité offensive, outils et techniques.',
  generatedAt: new Date().toISOString(),
  defaultNote: 'sommaire',
  stats: {
    notes: notes.length,
    techniques: groups.Techniques || 0,
    tools: groups.Outils || 0,
    guides: groups.Guides || 0,
    assets: assets.length,
    links: notes.reduce((total, note) => total + note.links.length, 0),
  },
  groups,
  categories,
  assets,
  notes,
}

await writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest)}\n`)
await writeFile(path.join(outputDir, 'search-index.json'), `${JSON.stringify(searchIndex)}\n`)

console.log(
  `Offsidian: ${manifest.stats.notes} notes, ${manifest.stats.assets} assets, ${manifest.stats.links} liens, ${Object.keys(searchIndex).length} termes indexés.`,
)

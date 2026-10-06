import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import MarkdownNote from '../src/offsidian/MarkdownNote'
import type { VaultManifest } from '../src/offsidian/types'
import { createVaultResolver } from '../src/offsidian/utils'

const manifest = JSON.parse(
  readFileSync(new URL('../public/offsidian/manifest.json', import.meta.url), 'utf8'),
) as VaultManifest
const resolver = createVaultResolver(manifest)
const note = resolver.noteById.get('sommaire')
assert(note, 'La note Sommaire doit exister')
const source = readFileSync(new URL(`../public/offsidian/vault/${note.path}`, import.meta.url), 'utf8')
const html = renderToStaticMarkup(
  <MarkdownNote source={source} note={note} manifest={manifest} resolver={resolver} onOpenNote={() => undefined} />,
)

assert.equal(manifest.notes.length, 344, 'Le manifeste doit contenir les 344 notes du vault')
assert.equal(manifest.stats.techniques, 154, 'Toutes les techniques doivent être indexées')
assert.equal(manifest.stats.tools, 172, 'Tous les outils doivent être indexés')
assert(html.includes('href="/offsidian/?note=index"'), 'Les wikilinks Obsidian doivent devenir des liens internes')
assert(html.includes('offsidian-callout--tip'), 'Les callouts Obsidian doivent être rendus')
assert(html.includes('vue dynamique Dataview'), 'Les requêtes Dataview doivent avoir un rendu web')
assert(!html.includes('[!tip]'), 'La syntaxe brute du callout ne doit pas rester visible')
assert(!html.includes('<script>'), 'Le HTML contenu dans les notes ne doit jamais être exécuté')

const indexNote = resolver.noteById.get('index')
assert(indexNote, 'La note Index doit exister')
const indexSource = readFileSync(new URL(`../public/offsidian/vault/${indexNote.path}`, import.meta.url), 'utf8')
const indexHtml = renderToStaticMarkup(
  <MarkdownNote source={indexSource} note={indexNote} manifest={manifest} resolver={resolver} onOpenNote={() => undefined} />,
)
assert(
  indexHtml.includes('href="/offsidian/?note=reconnaissance"'),
  'Les aliases wikilink échappés dans les tableaux doivent rester cliquables',
)

const ids = new Set(manifest.notes.map((item) => item.id))
assert.equal(ids.size, manifest.notes.length, 'Chaque note doit avoir un identifiant unique')
for (const item of manifest.notes) {
  for (const link of item.links) assert(ids.has(link.id), `Lien interne cassé depuis ${item.path}: ${link.id}`)
  for (const backlink of item.backlinks) assert(ids.has(backlink), `Backlink cassé depuis ${item.path}: ${backlink}`)
}

console.log(`✓ Offsidian: ${manifest.notes.length} notes, wikilinks, callouts, Dataview et liens vérifiés`)

/**
 * Test de montage du lecteur Offsidian dans un vrai DOM (jsdom).
 *
 * Le test de rendu statique (`smoke-offsidian.tsx`) ne couvre que le Markdown.
 * Celui-ci vérifie le câblage de l'application : chargement du manifeste,
 * ouverture de la note demandée, plan chargé en arrière-plan depuis
 * `outline.json`, palette de recherche.
 *
 * Usage : npx tsx scripts/smoke-offsidian-dom.tsx
 */
import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')

const dom = new JSDOM('<!doctype html><html><body><div id="offsidian-root"></div></body></html>', {
  url: 'http://localhost/offsidian/?note=outil-nmap',
  pretendToBeVisual: true,
})

const fetched: string[] = []

/* Le vault est servi depuis `public/`, comme en production. */
async function serve(url: string) {
  const target = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  fetched.push(target)
  const file = path.join(publicDir, target.replace(/^\/+/, ''))
  if (!file.startsWith(publicDir)) throw new Error(`Hors vault : ${target}`)
  try {
    const body = await readFile(file, 'utf8')
    return new Response(body, { status: 200 })
  } catch {
    return new Response('introuvable', { status: 404 })
  }
}

/* jsdom n'implémente pas le défilement : les navigateurs, si. */
dom.window.Element.prototype.scrollTo = () => undefined
dom.window.Element.prototype.scrollIntoView = () => undefined

/* Node expose déjà `navigator` en lecture seule : on redéfinit chaque global. */
const globals: Record<string, unknown> = {
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  location: dom.window.location,
  history: dom.window.history,
  localStorage: dom.window.localStorage,
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  fetch: (input: string) => serve(String(input)),
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Event: dom.window.Event,
  KeyboardEvent: dom.window.KeyboardEvent,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
}
for (const [key, value] of Object.entries(globals)) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true })
}

const { default: React } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: OffsidianApp } = await import('../src/offsidian/OffsidianApp')

const container = dom.window.document.getElementById('offsidian-root')!
createRoot(container).render(React.createElement(OffsidianApp))

/** Attend qu'une condition soit vraie, sinon échoue après `limit` ms. */
async function waitFor(label: string, test: () => boolean, limit = 4000) {
  const started = Date.now()
  while (Date.now() - started < limit) {
    if (test()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  assert.fail(`Timeout : ${label}`)
}

const text = () => dom.window.document.body.textContent ?? ''
const html = () => dom.window.document.body.innerHTML

await waitFor('le vault est monté', () => text().includes('Explorateur'))
await waitFor('la note demandée est ouverte', () => text().includes('Nmap'))
await waitFor(
  'le Markdown de la note est chargé',
  () => (dom.window.document.querySelector('.offsidian-markdown')?.textContent ?? '').length > 200,
)
assert(fetched.some((url) => url.includes('Outil - Nmap.md')), 'Le Markdown de la note doit être téléchargé')
assert.equal(
  dom.window.document.title,
  'Nmap — Offsidian · FoXhack',
  'Le titre de l’onglet doit suivre la note ouverte',
)
assert(fetched.includes('/offsidian/manifest.json'), 'Le manifeste doit être téléchargé')
assert(!fetched.includes('/offsidian/search-index.json'), 'L’index plein texte ne doit pas être téléchargé au démarrage')

await waitFor('le plan est chargé en arrière-plan', () => text().includes('Sur cette page'))
await waitFor('le plan est complet', () => dom.window.document.querySelectorAll('.offsidian-outline nav button').length > 3)
assert(fetched.includes('/offsidian/outline.json'), 'Le plan doit venir d’outline.json')

/* Les emoji ont été retirés du vault : le rendu ne doit pas en réintroduire. */
const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u
assert(!emoji.test(text()), 'Aucun emoji ne doit apparaître dans l’interface')

/* Palette de recherche : ⌘K ouvre la modale et charge l'index. */
dom.window.document.dispatchEvent(
  new dom.window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
)
await waitFor(
  'la palette de recherche est ouverte',
  () => Boolean(dom.window.document.querySelector('.offsidian-search-modal')),
)
await waitFor('l’index plein texte est chargé', () => fetched.includes('/offsidian/search-index.json'))

console.log(`✓ Offsidian: montage, note, plan et recherche vérifiés (${fetched.length} requêtes)`)
dom.window.close()

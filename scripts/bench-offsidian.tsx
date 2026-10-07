/**
 * Mesure du coût d'un défilement dans le lecteur Offsidian.
 *
 * Le scroll met à jour la barre de progression et le titre actif : si ces deux
 * valeurs vivent dans l'état de l'application, chaque frame re-rend tout
 * l'arbre (explorateur de 344 fichiers + note Markdown complète). Ce banc
 * compte les rendus React et leur durée pendant 60 frames de scroll.
 *
 * Usage : npx tsx scripts/bench-offsidian.tsx
 */
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

async function serve(url: string) {
  const target = decodeURIComponent(new URL(url, 'http://localhost').pathname)
  const file = path.join(publicDir, target.replace(/^\/+/, ''))
  if (!file.startsWith(publicDir)) throw new Error(`Hors vault : ${target}`)
  try {
    return new Response(await readFile(file, 'utf8'), { status: 200 })
  } catch {
    return new Response('introuvable', { status: 404 })
  }
}

/* jsdom ne fait pas de mise en page : on donne des métriques plausibles pour
   que la barre de progression et le titre actif évoluent vraiment. */
let scrollTopValue = 0
Object.defineProperty(dom.window.Element.prototype, 'scrollHeight', { get: () => 24000, configurable: true })
Object.defineProperty(dom.window.Element.prototype, 'clientHeight', { get: () => 800, configurable: true })
Object.defineProperty(dom.window.Element.prototype, 'scrollTop', {
  get: () => scrollTopValue,
  set: (value: number) => {
    scrollTopValue = value
  },
  configurable: true,
})
dom.window.Element.prototype.scrollTo = ((options?: ScrollToOptions | number) => {
  scrollTopValue = typeof options === 'number' ? options : (options?.top ?? 0)
}) as Element['scrollTo']
dom.window.Element.prototype.scrollIntoView = () => undefined

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

const { default: React, Profiler } = await import('react')
const { createRoot } = await import('react-dom/client')
const { default: OffsidianApp } = await import('../src/offsidian/OffsidianApp')

const renders: number[] = []
const container = dom.window.document.getElementById('offsidian-root')!
const reactRoot = createRoot(container)
reactRoot.render(
  React.createElement(
    Profiler,
    {
      id: 'offsidian',
      onRender: (_id: string, phase: string, actualDuration: number) => {
        if (phase === 'update') renders.push(actualDuration)
      },
    },
    React.createElement(OffsidianApp),
  ),
)

async function waitFor(label: string, test: () => boolean, limit = 6000) {
  const started = Date.now()
  while (Date.now() - started < limit) {
    if (test()) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`Timeout : ${label}`)
}

await waitFor('note rendue', () => (dom.window.document.querySelector('.offsidian-markdown')?.textContent ?? '').length > 200)

/* Chaque titre reçoit une position verticale, comme dans un vrai navigateur. */
const headings = [...dom.window.document.querySelectorAll<HTMLElement>('.offsidian-markdown h2[id], .offsidian-markdown h3[id]')]
headings.forEach((heading, index) => {
  Object.defineProperty(heading, 'offsetTop', { value: index * 420, configurable: true })
})

const scroller = dom.window.document.querySelector('.offsidian-document-scroll') as HTMLElement
const nextFrame = () => new Promise((resolve) => dom.window.requestAnimationFrame(() => resolve(undefined)))

renders.length = 0
const started = Date.now()
for (let frame = 0; frame < 60; frame += 1) {
  scrollTopValue = frame * 380
  scroller.dispatchEvent(new dom.window.Event('scroll'))
  await nextFrame()
  await nextFrame()
}
const elapsed = Date.now() - started

const total = renders.reduce((sum, value) => sum + value, 0)
console.log(`note : ${headings.length} titres suivis · ${(scroller.textContent ?? '').length} caractères rendus`)
console.log(`scroll de 60 frames en ${elapsed} ms`)
console.log(`  rendus React : ${renders.length} · ${total.toFixed(1)} ms cumulés (moyenne ${(total / Math.max(1, renders.length)).toFixed(2)} ms)`)

/* ------------------------------------------------------------------ saisie
   Ouvrir la palette (⌘K) puis taper : chaque frappe relance le scoring des
   344 notes et l'interrogation de l'index plein texte. */
dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))
await waitFor('palette ouverte', () => Boolean(dom.window.document.querySelector('.offsidian-search-input-row input')))
await waitFor('index chargé', () => Boolean(dom.window.document.querySelector('.offsidian-search-filters')))
await nextFrame()

const input = dom.window.document.querySelector('.offsidian-search-input-row input') as HTMLInputElement
const setNativeValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!

renders.length = 0
const typingStarted = performance.now()
for (const query of ['b', 'bu', 'bur', 'burp', 'burp s', 'burp su']) {
  setNativeValue.call(input, query)
  input.dispatchEvent(new dom.window.Event('input', { bubbles: true }))
  await nextFrame()
  await nextFrame()
  await new Promise((resolve) => setTimeout(resolve, 5))
}
const typingElapsed = performance.now() - typingStarted
const typingTotal = renders.reduce((sum, value) => sum + value, 0)
console.log(`6 frappes dans la recherche en ${typingElapsed.toFixed(0)} ms`)
console.log(`  rendus React : ${renders.length} · ${typingTotal.toFixed(1)} ms cumulés (moyenne ${(typingTotal / Math.max(1, renders.length)).toFixed(2)} ms)`)
console.log(`  résultats affichés : ${dom.window.document.querySelectorAll('.offsidian-search-result').length}`)
dom.window.close()

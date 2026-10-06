/**
 * Audit de répétition du portfolio FoXhack.
 * Découpe le HTML rendu par section, puis cherche les fragments de mots qui
 * reviennent dans plusieurs sections — c'est ce que l'auteur du site ressent
 * comme « on me répète toujours la même chose ».
 */
import { readFileSync } from 'node:fs'

const html = readFileSync(process.argv[2] ?? '/tmp/page.html', 'utf8')

/* --- découpage par section --------------------------------------------- */
/* Bornes explicites : le début de la i-ème section et sa vraie balise fermante
   `</section>`. Les anciennes bornes « section suivante » se chevauchaient
   (main / top / lab-terminal-help) et fabriquaient des centaines de faux
   doublons. */
const SECTION_IDS = ['about', 'skills', 'projects', 'github', 'ctf', 'socials', 'contact']
const parts = {}
const aboutAt = html.indexOf('id="about"')
if (aboutAt > 0) parts.top = html.slice(0, aboutAt) // hero + terminal
for (const id of SECTION_IDS) {
  const from = html.indexOf(`id="${id}"`)
  if (from < 0) continue
  const to = html.indexOf('</section>', from)
  parts[id] = html.slice(from, to > 0 ? to : html.length)
}
const footerAt = html.lastIndexOf('<footer')
if (footerAt >= 0) parts.footer = html.slice(footerAt)

const clean = (s) =>
  s
    .replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim()

const texts = Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, clean(v)]))

/* --- fragments répétés ------------------------------------------------- */
function ngrams(text, n) {
  const w = text.split(' ')
  const out = []
  for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(' ').toLowerCase())
  return out
}

for (const n of [5, 4]) {
  const seen = new Map()
  for (const [section, text] of Object.entries(texts)) {
    for (const g of ngrams(text, n)) {
      if (!seen.has(g)) seen.set(g, new Set())
      seen.get(g).add(section)
    }
  }
  const dupes = [...seen.entries()].filter(([, s]) => s.size > 1)
  console.log(`\n=== ${n} mots, présents dans plusieurs sections : ${dupes.length} ===`)
  const printed = []
  for (const [g, s] of dupes) {
    if (printed.some((p) => g.startsWith(p.split(' ').slice(0, 3).join(' ')))) continue
    printed.push(g)
    console.log(`· ${g}\n    → ${[...s].join(', ')}`)
    if (printed.length >= (n === 5 ? 18 : 10)) break
  }
}

/* --- mots-clés fréquents ---------------------------------------------- */
const words = clean(html).toLowerCase().match(/[a-zà-ÿ'’-]{3,}/g) ?? []
const freq = {}
for (const w of words) freq[w] = (freq[w] ?? 0) + 1
console.log('\n=== mots les plus fréquents (hors mots vides) ===')
const stop = new Set(['the', 'and', 'for', 'you', 'with', 'that', 'this', 'are', 'not', 'from', 'les', 'des', 'une', 'que', 'qui', 'dans', 'pour', 'sur', 'avec', 'pas', 'est', 'foX', 'foxhack', 'fox', 'hack', 'security', 'recherche'])
console.log(
  Object.entries(freq)
    .filter(([w]) => !stop.has(w) && w.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 22)
    .map(([w, c]) => `${w} (${c})`)
    .join(' · '),
)

console.log('\n=== volume par section ===')
for (const [k, t] of Object.entries(texts)) {
  if (k === 'terminal') continue
  console.log(`  ${k.padEnd(9)} ${String(t.split(' ').length).padStart(4)} mots`)
}

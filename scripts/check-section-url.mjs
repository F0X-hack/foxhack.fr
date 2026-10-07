/**
 * Vérifie la règle de recyclage des URLs sans slash final
 * (src/lib/sectionUrl.ts) — le cas qui rend `/offsidian` noir chez le
 * visiteur qui oublie le « / ».
 *
 *   npm run check:url
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(mkdtempSync(join(tmpdir(), 'section-url-')), 'sectionUrl.mjs')
execFileSync('npx', ['esbuild', 'src/lib/sectionUrl.ts', '--bundle', '--format=esm', `--outfile=${out}`, '--log-level=warning'], { stdio: 'inherit' })

const { missingSlashTarget } = await import(pathToFileURL(out).href)
rmSync(join(out, '..'), { recursive: true, force: true })

const cases = [
  ['tapé sans slash', '/offsidian', '', '', '/offsidian/'],
  ['avec un deep-link', '/offsidian', '?note=outil-nmap', '#usage', '/offsidian/?note=outil-nmap#usage'],
  ['majuscules', '/Offsidian', '', '', '/offsidian/'],
  ['ancienne extension', '/offsidian.html', '', '', '/offsidian/'],
  ['déjà canonique — jamais de boucle', '/offsidian/', '', '', null],
  ['les autres pages du labo', '/evilfox', '', '', '/evilfox/'],
  ['la page mfkey32', '/mfkey32', '', '', '/mfkey32/'],
  ['le catalogue outils', '/tools', '?q=mfkey', '', '/tools/?q=mfkey'],
  ['accueil', '/', '', '', null],
  ['une note du vault', '/offsidian/vault/Cybersécurité Offensive/01 - Reconnaissance.md', '', '', null],
  ['ancre du portfolio', '/index.html', '', '', null],
]

let failed = 0
for (const [label, pathname, search, hash, expected] of cases) {
  const got = missingSlashTarget(pathname, search, hash)
  if (got !== expected) {
    failed += 1
    console.error(`✗ ${label} : ${pathname}${search}${hash} → ${JSON.stringify(got)}, attendu ${JSON.stringify(expected)}`)
  }
}

if (failed) {
  console.error(`${failed} cas sur ${cases.length} ne passent pas`)
  process.exit(1)
}
console.log(`✓ URLs sans slash corrigées, aucune boucle de redirection (${cases.length} cas)`)

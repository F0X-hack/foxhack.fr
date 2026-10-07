/**
 * Vérifie la règle de surlignage (src/lib/pickActiveSection.ts) sur des
 * positions simulées — dont le cas qui plantait : un clic sur CTF doit
 * surligner CTF, pas SOCIALS.
 *
 *   npm run check:scrollspy
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const out = join(mkdtempSync(join(tmpdir(), 'scrollspy-')), 'pickActiveSection.mjs')
execFileSync('npx', ['esbuild', 'src/lib/pickActiveSection.ts', '--bundle', '--format=esm', `--outfile=${out}`, '--log-level=warning'], { stdio: 'inherit' })

const { pickActiveSection, PROBE_RATIO } = await import(pathToFileURL(out).href)
rmSync(join(out, '..'), { recursive: true, force: true })

const viewport = 900
const probe = viewport * PROBE_RATIO
const rects = (pairs) => pairs.map(([id, top]) => ({ id, top }))

const cases = [
  ['haut de page — aucune section suivie', [['about', 700], ['skills', 1900], ['projects', 3000], ['ctf', 4000], ['socials', 5000]], ''],
  ['clic ABOUT', [['about', 96], ['skills', 1300], ['projects', 2400], ['ctf', 3400], ['socials', 4400]], 'about'],
  ['clic SKILLS', [['about', -900], ['skills', 96], ['projects', 1400], ['ctf', 2400], ['socials', 3400]], 'skills'],
  ['clic CTF — le bug signalé', [['about', -3400], ['skills', -2400], ['projects', -1200], ['ctf', 96], ['socials', 816]], 'ctf'],
  ['lecture au milieu de CTF', [['about', -3800], ['skills', -2800], ['projects', -1600], ['ctf', -300], ['socials', 420]], 'ctf'],
  ['clic SOCIALS', [['about', -4600], ['skills', -3600], ['projects', -2400], ['ctf', -1400], ['socials', 96]], 'socials'],
  ['bas de page (stats / contact après socials)', [['about', -6000], ['skills', -5000], ['projects', -3800], ['ctf', -2800], ['socials', -1500]], 'socials'],
]

let failures = 0
for (const [label, pairs, expected] of cases) {
  const got = pickActiveSection(rects(pairs), probe)
  const ok = got === expected
  if (!ok) failures += 1
  console.log(`${ok ? '✓' : '✗'} ${label} → ${got || '(aucune)'}${ok ? '' : ` (attendu : ${expected})`}`)
}

console.log(`\nsonde = ${Math.round(probe)} px sur ${viewport} px · échecs : ${failures}`)
if (failures) process.exit(1)

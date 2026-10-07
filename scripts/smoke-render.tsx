/**
 * Smoke test de rendu : compile toute l'arborescence de composants et vérifie
 * que la page se rend sans erreur (aucun accès DOM au niveau module, aucun
 * composant cassé). Utile en CI légère.
 *
 *   npx vite build --ssr scripts/smoke-render.tsx --outDir dist-ssr
 *   node dist-ssr/smoke-render.js
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import Home from '../src/pages/Home'
import ToolsPage from '../src/tools/ToolsPage'

const html = renderToStaticMarkup(<Home />)

/* Catalogue /tools/ : la catégorie outils doit exposer Mfkey32. */
const toolsHtml = renderToStaticMarkup(<ToolsPage />)

/* Page Mfkey32 servie telle quelle depuis public/mfkey32/. */
const mfkey32Shell = readFileSync(new URL('../public/mfkey32/index.html', import.meta.url), 'utf8')
const mfkey32Assets = [
  'css/styles.css',
  'js/app.js',
  'js/mfkey32.mjs',
  'js/mfkey-worker.js',
  'js/flipper-serial.js',
  'js/protobuf.js',
  'js/icons.js',
  'assets/mfkey32-mark.svg',
  'assets/exemple.mfkey32.log',
  'docs/mfkey32v2.md',
]
const mfkey32OnDisk = mfkey32Assets.filter((name) => existsSync(new URL(`../public/mfkey32/${name}`, import.meta.url)))

/* Page Reaper statique et ses assets, servis sur /reaper. */
const originalHtml = readFileSync(new URL('../public/reaper/index.html', import.meta.url), 'utf8')
const reaperAssets = ['logo.png', 'board.png', 'backboard.png', 'case.png', 'frontcase.png', 'leftcase.png', 'rightcase.png']
const assetsOnDisk = reaperAssets.filter((name) => existsSync(new URL(`../public/reaper/${name}`, import.meta.url)))

/* SEO : la coquille HTML n'est pas dans le rendu React, on la lit sur disque. */
const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
const sitemapOk =
  sitemap.startsWith('<?xml') &&
  sitemap.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"') &&
  sitemap.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"') &&
  /<\/urlset>\s*$/.test(sitemap)

let graph: Array<Record<string, unknown>> = []
try {
  const ld = shell.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  graph = JSON.parse(ld ? ld[1] : '{}')['@graph'] ?? []
} catch {
  graph = []
}
const types = graph.map((n) => n['@type'])
/* Le h1 du hero, délimité : les contrôles doivent porter sur son contenu exact,
   pas sur tout ce qui suit dans la page (un <title> de SVG plus bas dans le
   document ferait échouer un test mal borné). */
const h1 = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/)?.[0] ?? ''
const itemList = graph.find((n) => n['@type'] === 'ItemList') as { itemListElement?: unknown[] } | undefined

// DUMP_HTML=/tmp/page.html → écrit le markup pour inspection
if (process.env.DUMP_HTML) writeFileSync(process.env.DUMP_HTML, html)

const checks: [string, boolean][] = [
  ['hero title present', html.includes('FoX')],
  ['offensive security title', html.includes('OFFENSIVE')],
  /* La console a été retirée : plus aucune trace du faux shell… */
  [
    'console retirée (plus de faux shell)',
    !html.includes('foxhack@kali') &&
      !html.includes('lab-terminal') &&
      !html.includes('frontend simulation'),
  ],
  /* …et son contenu se lit désormais dans whoami. */
  [
    'whoami : identité affichée',
      html.includes('LOCATION') &&
      html.includes('STATUS') &&
      html.includes('Learning / Building'),
  ],
  ['whoami : notes de travail', html.includes('Learn → Break')],
  [
    'whoami : inventaire du labo cliquable',
      html.includes('whoami.txt') &&
      html.includes('skills.txt') &&
      html.includes('ctf.log') &&
      html.includes('.secrets/'),
  ],
  ['about section', html.includes('WHO AM I?')],
  ['skills section', html.includes('OFFENSIVE SECURITY')],
  ['hardware inventory', html.includes('Flipper Zero') && html.includes('HackRF One')],
  /* Les fiches matériel ne doivent porter aucune caractéristique inventée.
     Deux mentions viennent de l'inventaire fourni et sont donc tolérées :
     « 2.4 GHz » (jammer) et « 2W » (Raspberry Pi 2W, un nom de produit). */
  [
    'hardware card has no invented specs',
    (() => {
      const from = html.indexOf('HARDWARE / EMBEDDED')
      if (from < 0) return false
      const card = html.slice(from, from + 4000)
      const specs = card.match(/\d+(?:\.\d+)?\s?(?:MHz|GHz|mAh|dBm|mm|V|W)\b/g) ?? []
      const ALLOWED = ['2.4 GHz', '2W']
      return specs.every((spec) => ALLOWED.includes(spec))
    })(),
  ],
  ['no snapshot wording anywhere', !/snapshot/i.test(html)],
  [
    'sas d’entrée : le loader attend une interaction',
    html.includes('data-boot="screen"') &&
      html.includes('click or press any key to enter') &&
      html.includes('>ENTER<'),
  ],
  [
    'eight skill domains rendered',
    ['RED TEAM OPS', 'SYSTEMS &amp; DEFENSE', 'NETWORK &amp; INFRA'].every((t) => html.includes(t)),
  ],
  ['languages listed', html.includes('PowerShell') && html.includes('C') && html.includes('Batch')],
  [
    'hardware inventory as chips on a wide card',
    (html.match(/chip px-2\.5 py-1/g) ?? []).length >= 20 && html.includes('sm:col-span-2'),
  ],
  [
    'EvilFoX renvoie vers une route locale',
    html.includes('href="/evilfox"') &&
      !/href="\/evilfox"[^>]*target="_blank"/.test(html) &&
      !/\b(?:evilfox|foxhid|reaper)\.foxhack\.fr\b/.test(html) &&
      !html.includes('onrender.com'),
  ],
  [
    'Offsidian est une catégorie locale du site',
    html.includes('href="/offsidian/"') &&
      html.includes('344 public knowledge notes') &&
      html.includes('OPEN THE VAULT'),
  ],
  [
    'FoX-HID renvoie vers une route locale',
    html.includes('FoX-HID') &&
      html.includes('href="/foxhid"') &&
      !/href="\/foxhid"[^>]*target="_blank"/.test(html),
  ],
  [
    'Reaper renvoie vers une route locale',
    html.includes('Reaper') &&
      html.includes('BW16') &&
      html.includes('href="/reaper"') &&
      !/href="\/reaper"[^>]*target="_blank"/.test(html),
  ],
  [
    'EvilFoX toujours en tête et mis en avant',
    html.indexOf('EvilFoX') < html.indexOf('Reaper') && html.includes('evilfox / web-ui'),
  ],
  [
    'page Reaper d’origine servie telle quelle',
    originalHtml.includes('<title>REAPER — BW16 WiFi Deauth Tool</title>') &&
      originalHtml.includes('<base href="/reaper/">'),
  ],
  ['assets d’origine de la page Reaper', assetsOnDisk.length === reaperAssets.length],
  [
    'échéances à venir (World Skills / Passe ton hack d’abord)',
    html.includes('WORLD SKILLS') && html.includes('PASSE TON HACK D') && html.includes('next operations'),
  ],
  [
    'aucune date inventée pour les échéances',
    !/\b(19|20)\d{2}\b/.test(html.slice(html.indexOf('next operations'), html.indexOf('platform figures'))),
  ],
  ['root-me stats', html.includes('2,175')],
  [
    'SYSTEM INFO et THE JOURNEY retirés',
    !html.includes('SYSTEM INFO') && !html.includes('journey.log') && !html.includes('2,590') && !html.includes('33.8K'),
  ],
  ['tryhackme stats', html.includes('19,085') && html.includes('142')],
  ['tryhackme rank badge', html.includes('0xC')],
  ['hackthebox stats', html.includes('6 / 554') && html.includes('APPRENTICE')],
  ['handle Hack The Box', html.includes('FoXhxck #FR')],
  ['htb rank badge asset', /\/badges\/htb-apprentice-[0-9a-f]{8}\.png/.test(html)],
  ['honesty note kept', html.includes('not a live feed')],
  [
    'nav links et sections alignés',
    ['about', 'skills', 'projects', 'ctf', 'socials'].every(
      (id) => html.includes(`href="#${id}"`) && html.includes(`id="${id}"`),
    ),
  ],
  ['contact section', html.includes("LET&#x27;S CONNECT")],
  ['footer disclaimer', html.includes('authorized security testing only')],
  [
    'responsive mobile : zones sûres et cibles tactiles',
    ['safe-top', 'safe-bottom', 'hero-top'].every((c) => html.includes(c)) &&
      (html.match(/min-h-\[44px\]/g) ?? []).length >= 20,
  ],
  ['no fake email', !/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(html)],
  ['avatar present + hashed url', /\/profile-[0-9a-f]{8}\.jpg/.test(html)],
  ['hero portrait present + hashed url', /\/profile-hero-[0-9a-f]{8}\.jpg/.test(html)],
  [
    'two distinct portraits (hero ≠ whoami)',
    new Set(html.match(/\/profile(?:-hero)?-[0-9a-f]{8}\.jpg/g) ?? []).size === 2,
  ],
  ['no legacy avatar path', !/['\"]\/profile\.jpg/.test(html)],
  ['hero uses the drawn wordmark', html.includes('brand-mark--wordmark')],
  ['brand glitch dedsec', html.includes('brand-mark--glitch')],
  /* ---------- SEO ---------- */
  ['titre et rôle dans le h1 rendu', /FoXhack — Offensive Security Researcher/i.test(h1)],
  [
    'wordmark du h1 décoratif (texte lu, SVG ignoré)',
    h1.includes('aria-hidden="true"') && !h1.includes('<title>') && h1.includes('sr-only'),
  ],
  ['canonical sur foxhack.fr', shell.includes('<link rel="canonical" href="https://foxhack.fr/" />')],
  ['plus aucun renvoi à foxhack.dev', !shell.includes('foxhack.dev') && !robots.includes('foxhack.dev') && !sitemap.includes('foxhack.dev')],
  ['OpenGraph absolu sur foxhack.fr', shell.includes('og:url" content="https://foxhack.fr/"') && shell.includes('https://foxhack.fr/og-image-7568422c.png')],
  ['og:image 1200x630 déclarée', shell.includes('og:image:width" content="1200"') && shell.includes('og:image:height" content="630"')],
  ['locale cohérente avec la langue de la page', shell.includes('og:locale" content="en_US"')],
  [
    'JSON-LD : Person + WebSite + ProfilePage + ItemList',
    ['Person', 'WebSite', 'ProfilePage', 'ItemList'].every((t) => types.includes(t)),
  ],
  ['JSON-LD : les 8 projets listés', (itemList?.itemListElement ?? []).length === 8],
  ['JSON-LD : Mfkey32 listé', shell.includes('"name": "Mfkey32"')],
  ['JSON-LD : routes de projets sur foxhack.fr', shell.includes('https://foxhack.fr/foxhid') && shell.includes('https://foxhack.fr/reaper') && shell.includes('https://foxhack.fr/evilfox')],
  ['robots.txt : sitemap déclaré', robots.includes('Sitemap: https://foxhack.fr/sitemap.xml')],
  ['sitemap.xml : URL canonique', sitemap.includes('<loc>https://foxhack.fr/</loc>')],
  ['sitemap.xml : forme et namespaces valides', sitemapOk],
  ['sitemap.xml : images déclarées (extension Google)', (sitemap.match(/<image:loc>/g) ?? []).length >= 2],
  ['sitemap.xml : aucune URL hors du domaine', locs.every((u) => u.startsWith('https://foxhack.fr/'))],
  ['sitemap.xml : Offsidian publié', locs.includes('https://foxhack.fr/offsidian/')],
  ['sitemap.xml : pas de fragment dans les URLs', !locs.some((u) => u.includes('#'))],
  ['robots.txt : routes de projets accessibles', robots.includes('Allow: /') && !robots.includes('Disallow: /reaper')],
  [
    'sitemap.xml : les routes projet présentes',
    ['/evilfox', '/foxhid', '/reaper', '/mfkey32'].every((path) =>
      locs.some((url) => url === `https://foxhack.fr${path}` || url === `https://foxhack.fr${path}/`),
    ),
  ],
  [
    'page Mfkey32 servie telle quelle',
    mfkey32Shell.includes('<link rel="canonical" href="https://foxhack.fr/mfkey32/" />') &&
      mfkey32Shell.includes('href="css/styles.css?v=workbench-13"') &&
      mfkey32Shell.includes('src="js/app.js?v=workbench-13"'),
  ],
  ['assets Mfkey32 présents', mfkey32OnDisk.length === mfkey32Assets.length],
  [
    'catalogue outils : Mfkey32, seul outil du catalogue',
    toolsHtml.includes('Mfkey32') &&
      toolsHtml.includes('href="/mfkey32/"') &&
      (toolsHtml.match(/tools-card__action/g) ?? []).length === 1,
  ],
  ['catalogue outils : catégorie NFC / RFID filtrée', toolsHtml.includes('NFC / RFID')],
  [
    'catalogue outils : wordmark FoXhack en haut à gauche',
    toolsHtml.includes('brand-mark brand-mark--wordmark tools-brand__wordmark') &&
      !toolsHtml.includes('tools-brand__mark') &&
      mfkey32Shell.includes('assets/mfkey32-mark.svg'),
  ],
  [
    'catalogue outils : plus de Revshell / CIDR / emplacements à venir',
    !toolsHtml.includes('Revshell') &&
      !/CIDR/i.test(toolsHtml) &&
      !toolsHtml.includes('À VENIR') &&
      !toolsHtml.includes('EN PRÉPARATION'),
  ],
  [
    'catalogue outils : notice GPL de Mfkey32 liée',
    toolsHtml.includes('href="/licenses/mfkey32-NOTICE.txt"'),
  ],
  [
    'portfolio : Mfkey32 dans la section projets',
    html.includes('Mfkey32') && html.includes('href="/mfkey32/"') && html.includes('MIFARE Classic'),
  ],
  [
    'repli sans JavaScript : projets et réseaux',
    shell.includes('<noscript>') &&
      shell.includes('FoX-HID</a>') &&
      shell.includes('https://foxhack.fr/mfkey32/') &&
      shell.includes('TryHackMe — FoXhack'),
  ],
  ['no legacy fox icon', !html.includes('FoxMark')],
  [
    'FoX-HID card details (DuckyScript + Web Serial)',
    html.includes('DuckyScript') && html.includes('Web Serial') && html.includes('ESP32-S2'),
  ],
  ['dedsec only: no skin switch', !html.includes('Switch skin') && !html.includes('wired') && html.includes('ch 07 · dedsec') && shell.includes('data-theme="dedsec"')],
  ['museum removed from page and navigation', !/museum/i.test(html)],
  ['museum removed from sitemap', !sitemap.includes('/museum/')],
  ['no matrix cliché', !html.toLowerCase().includes('matrix')],
]

let failed = 0
for (const [name, passed] of checks) {
  if (!passed) failed += 1
  console.log(`${passed ? '✓' : '✗'} ${name}`)
}

console.log(`\nhtml length: ${html.length} chars · ${failed} failure(s)`)
if (failed > 0) process.exitCode = 1

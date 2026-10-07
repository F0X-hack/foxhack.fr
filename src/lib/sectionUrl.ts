/**
 * URLs des pages sœurs du portfolio.
 *
 * Chaque page est construite par Vite dans son propre dossier
 * (`dist/offsidian/index.html`). Un hôte statique qui ne gère pas l'« index de
 * dossier » ne trouve donc aucun fichier au chemin `/offsidian` : il renvoie
 * soit un 404, soit le fallback SPA — c'est-à-dire `index.html`, la page
 * d'accueil. Le visiteur qui a tapé `foxhack.fr/offsidian` (sans slash final)
 * atterrit sur un écran noir : le CSS du portfolio, mais aucune note.
 *
 * `public/_redirects` corrige le problème côté hébergeur (Netlify, Cloudflare
 * Pages). Ce module fait la même chose côté client, pour les hébergeurs qui
 * appliquent leur fallback avant de regarder les fichiers — le seul cas où le
 * JS du portfolio est exécuté sur la mauvaise URL, donc le seul réparable ici.
 */

/** Dossiers qui possèdent leur propre page construite. */
export const SECTIONS = ['offsidian', 'evilfox', 'foxhid', 'reaper', 'tools', 'mfkey32'] as const

export type Section = (typeof SECTIONS)[number]

/** `/offsidian` → `/offsidian/`. Renvoie `null` si l'URL est déjà canonique. */
export function missingSlashTarget(pathname: string, search = '', hash = '') {
  // Une URL qui finit déjà par « / » est la forme canonique : y toucher
  // créerait une boucle de redirections.
  if (pathname.endsWith('/')) return null

  const clean = pathname.replace(/\/+$/, '').toLowerCase()
  const section = SECTIONS.find((name) => clean === `/${name}` || clean === `/${name}.html`)
  if (!section) return null

  return `/${section}/${search}${hash}`
}

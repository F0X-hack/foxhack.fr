/**
 * ============================================================================
 *  PLATFORMS — section CTF (`$ cat /var/log/ctf.log`).
 *  Root-Me et TryHackMe : chiffres fournis par FoXhack, affichés comme des
 *  captures de profils. Hack The Box : aucun chiffre fourni → simple lien de profil.
 *  `nextOps` : prochaines échéances annoncées par FoXhack — participation à
 *  venir, sans date, sans classement et sans résultat inventé.
 * ============================================================================
 */

export type PlatformStat = { value: string; label: string }

export type Platform = {
  id: string
  name: string
  username: string
  url: string
  cta: string
  icon: 'rootme' | 'tryhackme' | 'hackthebox'
  /** Statistiques publiques connues (uniquement celles fournies) */
  stats?: PlatformStat[]
  /** Rang affiché sur le profil, ex. « 0xC · GURU » (facultatif) */
  rank?: string
  /** Pastille de rang (image déployée, écrite par scripts/make_assets.py) */
  rankBadge?: string
  /** Catégories visibles sur le profil */
  categories?: string[]
  /** Challenges notamment visibles sur le profil */
  challenges?: string[]
  /** true → pas de stats affichées (aucune donnée fournie) */
  statsUnavailable?: boolean
}

export const platformsMeta = {
  heading: '$ cat /var/log/ctf.log',
  title: 'CTF & SECURITY PLATFORMS',
  subtitle: 'Challenges, labs and machines — learning offensive security by doing.',
  noStatsNote: 'No public statistics shared here — open the profile for live data.',
} as const

export const platforms: Platform[] = [
  {
    id: 'rootme',
    name: 'ROOT-ME',
    username: 'FoXhack',
    url: 'https://www.root-me.org/FoXhack-905332',
    cta: 'OPEN ROOT-ME →',
    icon: 'rootme',
    stats: [
      { value: '2,175', label: 'PTS' },
      { value: '123', label: 'CHALLENGES' },
      { value: '1', label: 'COMPROMISE' },
    ],
    categories: ['Web Client', 'Web Server', 'Network', 'Steganography'],
    challenges: [
      'XSS - Server Side',
      'XSLT - Exécution de code',
      'Python - Server-side Template Injection Introduction',
      'Java - Server-side Template Injection',
      'XML External Entity',
      'XPath Injection',
      'Remote File Inclusion',
      'Command Injection',
    ],
  },
  {
    id: 'tryhackme',
    name: 'TRYHACKME',
    username: 'FoXhack',
    url: 'https://tryhackme.com/p/FoXhack',
    cta: 'PROFILE →',
    icon: 'tryhackme',
    rank: '0xC · GURU',
    stats: [
      { value: '19,085', label: 'POINTS' },
      { value: '142', label: 'ROOMS COMPLETED' },
      { value: '18', label: 'BADGES' },
      { value: '40,201', label: 'GLOBAL RANK' },
    ],
  },
  {
    id: 'hackthebox',
    name: 'HACK THE BOX',
    /** handle tel que fourni par FoXhack (le suffixe #FR est son étiquette de pays) */
    username: 'FoXhxck #FR',
    url: 'https://app.hackthebox.com/public/users/2037883',
    cta: 'PROFILE →',
    icon: 'hackthebox',
    rank: 'APPRENTICE · SCRIPT KIDDIE',
    rankBadge: '/badges/htb-apprentice-9361592a.png',
    stats: [
      { value: '6 / 554', label: 'MACHINES SOLVED' },
      { value: '19', label: 'GLOBAL LEVEL' },
      { value: '131 / 472', label: 'LEVEL XP' },
    ],
  },
]

/**
 * Prochaines échéances — « next operations ».
 * On n'annonce qu'une chose : une participation à venir. Aucune date, aucun
 * résultat, aucun classement : ces informations n'existent pas encore.
 */
export const nextOps = [
  {
    id: 'worldskills',
    title: 'WORLD SKILLS',
    badge: 'upcoming',
    note: 'Upcoming participation — skill competition.',
  },
  {
    id: 'passe-ton-hack',
    title: "PASSE TON HACK D'ABORD",
    badge: 'upcoming',
    note: 'Upcoming participation — cyber challenge.',
  },
] as const

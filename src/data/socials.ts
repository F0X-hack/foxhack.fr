/**
 * ============================================================================
 *  SOCIALS — sections `$ ./connect.sh`, social grid et SECTION SOCIAL MEDIA.
 *  Les compteurs Instagram / TikTok proviennent des profils fournis et sont
 *  présentés comme des captures de profils publics (pas de live, pas de fausses stats).
 * ============================================================================
 */

export type SocialIconKey =
  | 'github'
  | 'instagram'
  | 'tiktok'
  | 'guns'
  | 'tryhackme'
  | 'hackthebox'
  | 'rootme'
  | 'evilfox'

export type SocialAccount = {
  id: string
  platform: string
  /** Nom affiché sur la plateforme */
  displayName: string
  /** Username public */
  username: string
  url: string
  description: string
  /** Libellé du bouton */
  cta: string
  icon: SocialIconKey
  /** Bio publique du profil (recopiée telle quelle) */
  bio?: string[]
  /** Chiffres capturés depuis le profil public — jamais présentés comme du live */
  figures?: { value: string; label: string }[]
}

/** Cartes détaillées (section SOCIAL MEDIA) */
/** Réserve : chiffres déjà saisis pour Instagram / TikTok / Guns.lol / EvilFoX.
 *  Non affichés aujourd'hui (la grille FIND ME ONLINE utilise `socialGrid` et la
 *  carte SYSTEM INFO a été retirée). Réutilisables en un seul import. */
export const socialAccounts: SocialAccount[] = [
  {
    id: 'instagram',
    platform: 'INSTAGRAM',
    displayName: 'Foxhack',
    username: '@foxhxck',
    url: 'https://www.instagram.com/foxhxck',
    description: 'Ethical hacking, CTF and security content.',
    cta: 'OPEN PROFILE →',
    icon: 'instagram',
    bio: [
      "I'm FoXhack",
      "I'm 18 and self taught in Ethical hacking",
      'Tiktok : F.o.X_zero',
      '(pentester, red teamer, Ctf player)...',
    ],
    figures: [
      { value: '2,590', label: 'FOLLOWERS' },
      { value: '11', label: 'FOLLOWING' },
    ],
  },
  {
    id: 'tiktok',
    platform: 'TIKTOK',
    displayName: 'Fo.X_zero',
    username: '@f.o.x_zero',
    url: 'https://www.tiktok.com/@f.o.x_zero',
    description: 'Cybersecurity shorts, lab experiments and CTF moments.',
    cta: 'OPEN PROFILE →',
    icon: 'tiktok',
    bio: [
      'Ici on parle de : Cybersécurité',
      'My website : guns.lol/foxhack',
      'Insta : instagram.com/foxhxck',
    ],
    figures: [
      { value: '5,150', label: 'FOLLOWERS' },
      { value: '33.8K', label: 'LIKES' },
      { value: '217', label: 'FOLLOWING' },
    ],
  },
  {
    id: 'guns',
    platform: 'GUNS.LOL',
    displayName: 'FoXhack',
    username: 'guns.lol/foxhack',
    url: 'https://guns.lol/foxhack',
    description: 'Personal profile / social hub',
    cta: 'OPEN HUB →',
    icon: 'guns',
  },
  {
    id: 'evilfox',
    platform: 'EVILFOX',
    displayName: 'EvilFoX',
    username: 'foxhack.fr/evilfox',
    url: '/evilfox',
    description: 'Security research / ESP32 project',
    cta: 'OPEN PROJECT →',
    icon: 'evilfox',
  },
]

/** Grille complète des liens (section Socials grid) */
export const socialGrid: SocialAccount[] = [
  {
    id: 'github',
    platform: 'GITHUB',
    displayName: 'F0X-hack',
    username: '@F0X-hack',
    url: 'https://github.com/F0X-hack',
    description: 'Source code, tools and security research projects.',
    cta: 'VIEW PROFILE →',
    icon: 'github',
  },
  {
    id: 'instagram',
    platform: 'INSTAGRAM',
    displayName: 'Foxhack',
    username: '@foxhxck',
    url: 'https://www.instagram.com/foxhxck',
    description: 'Security content and behind-the-scenes of the lab.',
    cta: 'VIEW PROFILE →',
    icon: 'instagram',
  },
  {
    id: 'tiktok',
    platform: 'TIKTOK',
    displayName: 'Fo.X_zero',
    username: '@f.o.x_zero',
    url: 'https://www.tiktok.com/@f.o.x_zero',
    description: 'Cybersecurity shorts, experiments, CTF moments.',
    cta: 'VIEW PROFILE →',
    icon: 'tiktok',
  },
  {
    id: 'guns',
    platform: 'GUNS.LOL',
    displayName: 'FoXhack',
    username: 'guns.lol/foxhack',
    url: 'https://guns.lol/foxhack',
    description: 'Personal profile / social hub.',
    cta: 'OPEN HUB →',
    icon: 'guns',
  },
  {
    id: 'tryhackme',
    platform: 'TRYHACKME',
    displayName: 'FoXhack',
    username: 'tryhackme.com/p/FoXhack',
    url: 'https://tryhackme.com/p/FoXhack',
    description: 'Guided rooms and hands-on blue/red team learning paths.',
    cta: 'VIEW PROFILE →',
    icon: 'tryhackme',
  },
  {
    id: 'hackthebox',
    platform: 'HACK THE BOX',
    displayName: 'FoXhxck #FR',
    username: 'app.hackthebox.com/public/users/2037883',
    url: 'https://app.hackthebox.com/public/users/2037883',
    description: 'Machines, challenges and labs on the HTB platform.',
    cta: 'VIEW PROFILE →',
    icon: 'hackthebox',
  },
  {
    id: 'rootme',
    platform: 'ROOT-ME',
    displayName: 'FoXhack',
    username: 'root-me.org/FoXhack-905332',
    url: 'https://www.root-me.org/FoXhack-905332',
    description: 'Challenges solved across web, network and steganography.',
    cta: 'VIEW PROFILE →',
    icon: 'rootme',
  },
  {
    id: 'evilfox',
    platform: 'EVILFOX',
    displayName: 'EvilFoX',
    username: 'ESP32 / Wi-Fi security research',
    url: '/evilfox',
    description: 'Custom ESP32/M5StickC security research project.',
    cta: 'OPEN PROJECT →',
    icon: 'evilfox',
  },
]

export const socialsMeta = {
  heading: '$ ./connect.sh',
  title: 'FIND ME ONLINE',
  subtitle: 'Main profiles — social accounts, platforms and projects.',
} as const

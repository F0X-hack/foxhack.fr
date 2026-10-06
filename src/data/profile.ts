/**
 * ============================================================================
 *  PROFILE — source unique de vérité pour l'identité de FoXhack.
 *  Modifie ce fichier pour mettre à jour tout le site (hero, about, footer…).
 *  Aucune donnée n'est inventée : tout provient des informations fournies.
 * ============================================================================
 */

export const profile = {
  /** Nom affiché partout */
  name: 'FoXhack',

  /** Alias utilisé dans la section whoami */
  alias: 'Fo.X_zero',

  /** Réserve : les pseudos ne sont plus affichés dans About (ils y doublonnaient
   *  la grille des réseaux, section 06). Gardés au cas où. */
  usernames: ['@foxhxck', '@f.o.x_zero', '@F0X-hack'],

  /** Titre principal */
  title: 'OFFENSIVE SECURITY RESEARCHER',

  /** Baseline courte (SEO + sous-titre) */
  tagline:
    'Self-taught ethical hacker from France exploring offensive security, CTFs, web security and security research.',

  /** Description longue — section About */
  /* Sous-titre de la section whoami. Volontairement court : le rôle, l'origine,
     la méthode et la devise sont déjà dits ailleurs, une fois chacun. */
  bio: 'The file behind the handle.',

  location: { label: 'France' },

  /** 18 ans — auto-évaluation, apprenant continu */
  age: 18,

  status: 'Learning / Building',
  focus: 'Offensive Security',

  /** Phrases personnelles */
  motto: 'Breaking things. Building things. Learning how they work.',
  mottoAlt: 'Breaking things, legally.',
  quote: 'Curiosity is the exploit.',

  /** Bloc hero (structure imposée) */
  hero: {
    label: 'ONLINE',
    labelSuffix: 'SECURITY RESEARCH LAB',
    lines: ['OFFENSIVE', 'SECURITY', 'RESEARCHER'],
    subtitle: [
      'Self-taught ethical hacker from France.',
      'Breaking things to understand how they work.',
    ],
    primaryCta: { label: 'EXPLORE MY WORK', href: '#projects' },
    secondaryCta: { label: 'CONNECT', href: '#contact' },
  },

  /** Réserve : les domaines de focus n'étaient affichés que par la console
   *  (./focus.sh). Ils recoupaient déjà les cartes de la section skills, qui
   *  reste la seule source à l'écran — gardés au cas où. */
  focusAreas: [
    'Ethical Hacking',
    'Pentesting',
    'Red Team',
    'CTF',
    'Web Security',
    'Security Research',
  ],

  /** Réserve : variante terminal de la liste ci-dessus */
  focusAreasTerminal: [
    'Pentesting',
    'Red Teaming',
    'Web Security',
    'CTF',
    'Recon',
    'Security Research',
  ],

  /** Réserve : les étiquettes d'identité ne sont plus affichées dans About
   *  (elles y doublonnaient le tableau whoami et le hero). Gardées au cas où. */
  highlights: [
    '18 years old',
    'Self-taught',
    'Ethical Hacking',
    'Pentesting',
    'Red Team',
    'CTF Player',
  ],

  /** Table whoami (clé/valeur, affichée dans la section whoami) */
  whoami: [
    { key: 'USER', value: 'FoXhack' },
    { key: 'ALIAS', value: 'Fo.X_zero' },
    { key: 'LOCATION', value: 'France' },
    { key: 'AGE', value: '18' },
    { key: 'STATUS', value: 'Learning / Building' },
    { key: 'FOCUS', value: 'Offensive Security' },
  ],

  /** Profil GitHub (section $ git status) */
  github: {
    username: 'F0X-hack',
    role: 'Offensive Security Researcher',
    url: 'https://github.com/F0X-hack',
  },

  /**
   * Deux portraits, deux emplacements (le nom du fichier contient une empreinte
   * de son contenu : remplacer la photo change l'URL, donc aucun ancien portrait
   * ne peut rester en cache) :
   *
   *   avatar       → section « who am i »   (assets-src/profile-source.jpg)
   *   avatarHero   → hero, à côté du nom    (assets-src/profile-hero-source.jpg)
   *
   * Régénération : `python3 scripts/make_assets.py` (recadrage carré 900 px,
   * cadrage vers le haut, léger réhaussement pour le thème sombre).
   */
  avatar: '/profile-dab3cdda.jpg',
  avatarAlt:
    "Portrait de FoXhack en contre-plongée, capuche et lunettes, le visage éclairé par l'écran du téléphone qu'il tient dans les mains",

  /** Portrait du hero (à côté du nom) — autre photo, autre fichier. */
  avatarHero: '/profile-hero-0e561e6f.jpg',
  avatarHeroAlt:
    "Portrait de FoXhack assis dans l'embrasure d'une fenêtre, dans l'obscurité, prenant une photo avec un téléphone dont les LED dessinent des arcs lumineux",

  /**
   * Timeline — pas de dates inventées.
   * Réserve : la section « THE JOURNEY » n'est plus affichée (voir removed-decor).
   */
  timeline: {
    title: 'THE JOURNEY',
    steps: [
      'Cybersecurity',
      'Self-Taught',
      'CTF',
      'Web Security',
      'Pentesting',
      'Red Team',
      'Security Research',
      'Building Tools',
    ],
    flow: 'Learn → Break → Understand → Build',
  },

  /**
   * Réserve : la carte « SYSTEM INFO » n'est plus affichée (voir removed-decor).
   * Chiffres de profils publics — jamais présentés comme du live.
   */
  stats: [
    { value: '18', label: 'AGE' },
    { value: '2,590', label: 'INSTAGRAM FOLLOWERS' },
    { value: '5,150', label: 'TIKTOK FOLLOWERS' },
    { value: '33.8K', label: 'TIKTOK LIKES' },
    { value: '123', label: 'ROOT-ME CHALLENGES' },
    { value: '2,175', label: 'ROOT-ME POINTS' },
  ],
  statsNote: 'Social statistics captured from the public profiles — not a live feed.',

  /** Section contact */
  contact: {
    title: "LET'S CONNECT",
    text: 'Interested in cybersecurity, CTFs, ethical hacking or security research?',
  },

  /** Footer */
  footer: {
    year: 2026,
    lines: ['Built with curiosity.', 'Broken with intent.', 'Secured with knowledge.'],
    disclaimer: 'For educational purposes and authorized security testing only.',
  },

  seo: {
    title: 'FoXhack — Offensive Security Researcher',
    description:
      'FoXhack — Self-taught cybersecurity enthusiast from France focused on Ethical Hacking, Pentesting, Red Teaming, CTFs, Web Security and Security Research.',
    keywords: [
      'FoXhack',
      'Ethical Hacking',
      'Cybersecurity',
      'Pentesting',
      'Red Team',
      'CTF',
      'Security Research',
      'Web Hacking',
      'France',
    ],
    url: 'https://foxhack.dev/',
    ogImage: '/og-image-7568422c.png',
  },
} as const

export type Profile = typeof profile

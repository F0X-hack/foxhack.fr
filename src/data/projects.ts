/**
 * ============================================================================
 *  PROJECTS — cartes projet (section `$ ls -la ~/projects` + `$ git status`).
 *  Aucun projet, lien, techno ou métrique inventé.
 * ============================================================================
 */

export type ProjectMedia = { src: string; alt: string }
export type ProjectGalleryItem = ProjectMedia & { label: string }

export type Project = {
  name: string
  slug: string
  category: string
  description: string
  tech?: string[]
  url: string
  /** Texte affiché sur le bouton du projet */
  cta?: string
  /** Mention de responsabilité (projets offensifs / recherche) */
  disclaimer?: string
  /** Projet mis en avant dans la section GitHub */
  featured?: boolean
}

export const projects: Project[] = [
  {
    name: 'EvilFoX',
    slug: 'evilfox',
    category: 'ESP32 / Wi-Fi / Security Research',
    description:
      'A custom ESP32/M5StickC security research project exploring Wi-Fi analysis, firmware interaction and web-based device management.',
    tech: ['ESP32', 'M5StickC', 'C/C++', 'HTML', 'Web Interface'],
    /* Page projet servie sur le domaine principal. */
    url: '/evilfox',
    cta: 'VIEW PROJECT →',
    disclaimer: 'Authorized testing only.',
    featured: true,
  },
  {
    name: 'FoXPayload',
    slug: 'foxpayload',
    category: 'Security Research / Shell',
    /* Les dépôts GitHub sans description fournie : une ligne courte et propre
       vaut mieux qu'une phrase générique recopiée d'une carte à l'autre.
       Remplace-la par la vraie description quand tu l'as. */
    description: 'Payload work from the shell side.',
    url: 'https://github.com/F0X-hack/FoXPayload',
    cta: 'VIEW PROJECT →',
    featured: true,
  },
  {
    name: 'UnquotedFinder',
    slug: 'unquotedfinder',
    category: 'Windows Security / Privilege Escalation',
    description:
      'A security research tool focused on identifying unquoted service path issues.',
    tech: ['Windows', 'Security Research'],
    url: 'https://github.com/F0X-hack/UnquotedFinder',
    cta: 'VIEW PROJECT →',
    featured: true,
  },
  {
    name: 'Offsidian',
    slug: 'offsidian',
    category: 'Offensive Security',
    description: 'Offensive security experiments, kept small on purpose.',
    url: 'https://github.com/F0X-hack/Offsidian',
    cta: 'VIEW PROJECT →',
    featured: true,
  },
  {
    name: 'Pwnd-ChallSkid',
    slug: 'pwnd-challskid',
    category: 'CTF / Security',
    description: 'CTF challenges and machines, taken one by one.',
    url: 'https://github.com/F0X-hack/Pwnd-ChallSkid',
    cta: 'VIEW PROJECT →',
    featured: true,
  },
  {
    name: 'Reaper',
    slug: 'reaper',
    category: 'Hardware / Wi-Fi / Security Research',
    description:
      'A portable dual-band Wi-Fi tool built on the BW16 AiThinker: an on-device menu driven by three buttons and a 128x64 OLED, in a 3D-printed enclosure.',
    tech: ['BW16 RTL8720DN', 'C/C++', 'SSD1306 OLED', '3D printing'],
    /* La page d'origine est servie depuis public/reaper/ sur /reaper. */
    url: '/reaper',
    cta: 'VIEW PROJECT →',
    disclaimer: 'Authorized testing only.',
  },
  {
    name: 'FoX-HID',
    slug: 'fox-hid',
    category: 'Hardware / USB HID',
    description:
      'A BadUSB firmware for the ESP32-S2: a DuckyScript interpreter, a 64 KB USB mass-storage disk for payloads, an on-board OLED file browser and 12 keyboard layouts — flashed straight from the browser through Web Serial.',
    tech: ['ESP32-S2', 'BadUSB / HID', 'DuckyScript', 'SSD1306 OLED', 'Web Serial'],
    /* Page projet servie sur le domaine principal. */
    url: '/foxhid',
    cta: 'VIEW PROJECT →',
    disclaimer: 'Authorized testing only.',
  },
]

export const projectsMeta = {
  heading: '$ ls -la ~/projects',
  title: 'PROJECTS',
  subtitle: "Things I've built, broken and experimented with.",
  viewAll: { label: 'VIEW ALL PROJECTS →', href: 'https://github.com/F0X-hack' },
} as const

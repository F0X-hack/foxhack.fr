/**
 * ============================================================================
 *  SKILLS — section `$ cat skills.txt`.
 *  Liste volontairement courte et honnête : ce que FoXhack pratique vraiment.
 * ============================================================================
 */

export type SkillGroup = {
  id: string
  title: string
  /** Icône lucide (nom) ou 'custom' */
  icon: 'target' | 'globe' | 'flag' | 'code' | 'cpu' | 'crosshair' | 'server' | 'network'
  /** Accent utilisé avec parcimonie */
  /** accent visuel : 'signal' (accent principal) ou 'static' (froid/secondaire) */
  accent: 'signal' | 'static' | 'warm' | 'alert' | 'ok'
  items: string[]
  /**
   * 'chips' → inventaire affiché en pastilles (matériel), 'list' (défaut) →
   * liste à puces (compétences).
   */
  layout?: 'list' | 'chips'
  /** true → la carte occupe deux colonnes de la grille (inventaires longs) */
  wide?: boolean
  /** mention discrète en bas de carte (cadre d'usage, pas de spec inventée) */
  note?: string
}

export const skillsMeta = {
  heading: '$ cat skills.txt',
  title: 'SKILLS',
  subtitle: 'The toolbox — offense, defense, systems, network, code and hardware.',
} as const

export const skillGroups: SkillGroup[] = [

  {
    id: 'offensive',
    title: 'OFFENSIVE SECURITY',
    icon: 'target',
    accent: 'signal',
    items: [
      'Ethical Hacking',
      'Pentesting',
      'Red Teaming',
      'Vulnerability Research',
      'Reconnaissance',
      'Scanning & Enumeration',
      'Vulnerability Exploitation',
    ],
  },
  {
    id: 'web',
    title: 'WEB SECURITY',
    icon: 'globe',
    accent: 'signal',
    items: [
      'Web Hacking',
      'XSS',
      'SQL Injection',
      'Command Injection',
      'File Inclusion',
      'SSTI',
      'XXE',
      'XPath Injection',
    ],
  },
  {
    id: 'ctf',
    title: 'CTF',
    icon: 'flag',
    accent: 'static',
    items: [
      'Web',
      'Network',
      'Steganography',
      'OSINT',
      'Privilege Escalation',
      'Reverse Engineering',
    ],
  },
  {
    id: 'redteam',
    title: 'RED TEAM OPS',
    icon: 'crosshair',
    accent: 'signal',
    items: [
      'Web, Network & System Pentests',
      'Pivoting & Lateral Movement',
      'Phishing Simulation / Social Engineering',
      'Pentest Reporting',
    ],
  },
  {
    id: 'systems',
    title: 'SYSTEMS & DEFENSE',
    icon: 'server',
    accent: 'static',
    items: [
      'Windows & Linux Administration',
      'Infrastructure & System Hardening',
      'Security Task Automation',
      'Log & Event Analysis',
      'Incident Response',
    ],
  },
  {
    id: 'network',
    title: 'NETWORK & INFRA',
    icon: 'network',
    accent: 'static',
    items: [
      'Switch Configuration',
      'Network Device Hardening',
      'Firewall / ACL / VPN',
      'Packet Capture & Analysis',
    ],
  },
  {
    id: 'dev',
    title: 'DEVELOPMENT',
    icon: 'code',
    accent: 'static',
    items: ['Python', 'Bash', 'PowerShell', 'C', 'Batch', 'HTML', 'CSS', 'JavaScript'],
  },
  {
    id: 'hardware',
    title: 'HARDWARE / EMBEDDED',
    icon: 'cpu',
    accent: 'static',
    layout: 'chips',
    wide: true,
    note: '// lab inventory — research & authorized testing only',
    items: [
      // RF / radio
      'Flipper Zero',
      'HackRF One',
      'Chameleon Ultra',
      'Jammer gun 2.4 GHz',
      'Wireless Communications Analysis',
      // Wi-Fi / réseau
      'Pwnagotchi',
      'USB Nugget',
      'Wi-Fi',
      // cartes & microcontrôleurs
      'Raspberry Pi 5',
      'Raspberry Pi 3B+',
      'Raspberry Pi 2W',
      'ESP32',
      'M5StickC',
      // banc de mesure & debug
      'Bus Pirate',
      'Oscilloscope',
      'Logic analyzer',
      'Multimeter',
      'T12 X Plus station',
      // reverse engineering & embarqué
      'Firmware',
      'Firmware Extraction',
      'Hardware Reverse Engineering',
      'RFID / NFC Security',
      'Hardware Tool Prototyping',
      'Embedded Security',
      'etc.',
    ],
  },
]

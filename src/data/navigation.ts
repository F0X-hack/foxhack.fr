/**
 * ============================================================================
 *  NAVIGATION — liens de la navbar, du footer et inventaire du labo.
 *  Le site est 100 % statique : aucun appel réseau n'est déclenché depuis le
 *  navigateur, et l'inventaire du labo n'est qu'une carte des sections.
 * ============================================================================
 */

export const navLinks = [
  { id: 'about', label: 'ABOUT', href: '#about' },
  { id: 'skills', label: 'SKILLS', href: '#skills' },
  { id: 'projects', label: 'PROJECTS', href: '#projects' },
  { id: 'ctf', label: 'CTF', href: '#ctf' },
  { id: 'socials', label: 'SOCIALS', href: '#socials' },
  { id: 'notes', label: 'NOTES', href: '/offsidian/' },
] as const

export const footerLinks = [
  { label: 'GitHub', href: 'https://github.com/F0X-hack' },
  { label: 'Instagram', href: 'https://www.instagram.com/foxhxck' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@f.o.x_zero' },
  { label: 'Root-Me', href: 'https://www.root-me.org/FoXhack-905332' },
  { label: 'TryHackMe', href: 'https://tryhackme.com/p/FoXhack' },
  { label: 'Hack The Box', href: 'https://app.hackthebox.com/public/users/2037883' },
] as const

/**
 * INVENTAIRE DU LABO — la liste de fichiers de la section whoami.
 * Elle sert de carte du site : chaque fichier ouvre la section correspondante.
 * C'est la seule partie qui reste de l'ancienne console (supprimée à la
 * demande) : l'information est maintenant lisible sans rien taper.
 */
export const labFiles = [
  { name: 'whoami.txt', role: 'identity, status, focus', href: '#about' },
  { name: 'skills.txt', role: 'tools and topics', href: '#skills' },
  { name: 'projects/', role: 'built, shipped, documented', href: '#projects' },
  { name: 'ctf.log', role: 'platforms, ranks, challenges', href: '#ctf' },
  { name: 'connect.sh', role: 'profiles and DMs', href: '#socials' },
  { name: 'contact.sh', role: 'how to reach out', href: '#contact' },
  { name: 'offsidian/', role: '344 public knowledge notes', href: '/offsidian/' },
  { name: '.secrets/', role: 'permission denied', href: null },
] as const

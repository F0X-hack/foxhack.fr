/**
 * ============================================================================
 *  pickActiveSection — règle de scroll-spy, volontairement simpliste.
 *
 *  On ne devine pas : la section courante est la DERNIÈRE dont le haut est
 *  passé au-dessus de la ligne de lecture (38 % de la hauteur de vue).
 *  Conséquences directes :
 *    · un clic sur une ancre place le haut de la section juste sous la barre
 *      de navigation (scroll-mt), donc sous la ligne de lecture → la section
 *      cliquée est toujours celle qui est surlignée ;
 *    · une seule section peut gagner, la fonction est pure et testable.
 *
 *  Le module n'importe rien (ni React ni DOM) : il tourne aussi en Node.
 * ============================================================================
 */

/** Ligne de lecture : 38 % de la hauteur du viewport. */
export const PROBE_RATIO = 0.38

export type ProbeItem = {
  /** identifiant de la section */
  id: string
  /** position du haut de la section, relative au viewport (peut être négative) */
  top: number
}

/** Renvoie l'id de la section sous la ligne de lecture (`''` avant la première). */
export function pickActiveSection(items: readonly ProbeItem[], probe: number): string {
  let current = ''
  for (const item of items) {
    if (item.top <= probe) current = item.id
  }
  return current
}

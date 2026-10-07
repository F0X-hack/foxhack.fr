import { useEffect } from 'react'
import { PROBE_RATIO, pickActiveSection, type ProbeItem } from '../lib/pickActiveSection'

/**
 * Allume le projecteur de la section qui occupe le centre de l'écran.
 *
 * On pose `data-spot` sur les sections qui portent un <Spotlight />, puis on
 * ajoute la classe `is-live` à celle qui passe sous la ligne de lecture — la
 * même règle que le surlignage du navbar (`pickActiveSection`), pour que la
 * lumière et le lien actif ne puissent jamais se contredire.
 *
 * Une seule lecture de position par frame de défilement, aucune écriture de
 * style en dehors du `classList.toggle` de la section concernée.
 */
export default function useSpotlightFocus() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-spot]'))
    if (!sections.length) return

    let frame = 0

    const read = () => {
      frame = 0
      const probe = window.innerHeight * PROBE_RATIO
      const items: ProbeItem[] = sections.map((section) => ({
        id: section.dataset.spot ?? '',
        top: section.getBoundingClientRect().top,
      }))
      const current = pickActiveSection(items, probe)
      for (const section of sections) {
        section.classList.toggle('is-live', (section.dataset.spot ?? '') === current)
      }
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(read)
    }

    read()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
}

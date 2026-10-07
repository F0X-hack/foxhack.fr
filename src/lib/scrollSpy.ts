import { useEffect, useRef, useState } from 'react'
import { PROBE_RATIO, pickActiveSection, type ProbeItem } from './pickActiveSection'

/**
 * ============================================================================
 *  useScrollSpy — surlignage du lien de navigation correspondant à la section
 *  en cours de lecture.
 *
 *  Pourquoi pas un IntersectionObserver : la version précédente utilisait une
 *  bande de 5 % de la hauteur et gardait l'entrée au « meilleur ratio » parmi
 *  les seules entrées *modifiées*. Résultat : à l'arrêt, le surlignage pouvait
 *  désigner la section suivante (clic sur CTF → SOCIALS surligné), parce que
 *  le dernier lot d'événements ne décrivait pas l'état final.
 *
 *  Ici : on lit la position réelle des sections à chaque frame de défilement
 *  (5 à 10 mesures, aucune écriture de style), on applique la règle pure
 *  `pickActiveSection`, et pendant un défilement déclenché par un clic on
 *  conserve la section cliquée jusqu'à l'arrivée sur la cible.
 * ============================================================================
 */

/** Marge de sécurité si `scrollend` n'est jamais confirmé (clic + défilement manuel). */
const LOCK_TIMEOUT_MS = 1800
/** Tolérance d'arrivée sur la cible, en pixels. */
const SETTLE_TOLERANCE = 4

export default function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState('')
  /** Position de défilement visée par le dernier clic (null = aucune cible en cours). */
  const target = useRef<number | null>(null)

  useEffect(() => {
    let frame = 0

    const read = () => {
      frame = 0
      const probe = window.innerHeight * PROBE_RATIO
      const items: ProbeItem[] = ids.map((id) => {
        const node = document.getElementById(id)
        return { id, top: node ? node.getBoundingClientRect().top : Number.POSITIVE_INFINITY }
      })
      const next = pickActiveSection(items, probe)
      setActive((previous) => (previous === next ? previous : next))
    }

    const schedule = () => {
      /* Défilement vers une ancre encore en cours : on ne vole pas le surlignage. */
      if (target.current !== null) {
        if (Math.abs(window.scrollY - target.current) <= SETTLE_TOLERANCE) target.current = null
        else return
      }
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
  }, [ids])

  /**
   * À appeler dans le `onClick` d'un lien d'ancre : la section cliquée est
   * surlignée immédiatement, et le reste pendant tout le défilement.
   */
  const select = (id: string) => {
    setActive(id)

    const node = document.getElementById(id)
    if (!node) {
      target.current = null
      return
    }

    const offset = Number.parseFloat(getComputedStyle(node).scrollMarginTop) || 0
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    target.current = Math.max(0, Math.min(node.getBoundingClientRect().top + window.scrollY - offset, max))
    window.setTimeout(() => (target.current = null), LOCK_TIMEOUT_MS)
  }

  return { active, select }
}

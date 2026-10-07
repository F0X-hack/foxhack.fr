import { useEffect, useRef } from 'react'

/** Séquence du Konami Code (flèches + B A). Purement visuel : aucun effet réel. */
export const KONAMI_SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const

/**
 * Déclenche `onUnlock` quand la séquence est tapée.
 * Le listener est passif et ne bloque jamais les raccourcis navigateur :
 * aucune touche n'est consommée, aucune action n'est exécutée sur la page.
 */
export default function useKonami(onUnlock: () => void) {
  const progress = useRef(0)
  const callback = useRef(onUnlock)
  callback.current = onUnlock

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const editing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable
      if (editing) return

      const expected = KONAMI_SEQUENCE[progress.current]
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key

      if (key === expected) {
        progress.current += 1
        if (progress.current === KONAMI_SEQUENCE.length) {
          progress.current = 0
          callback.current()
        }
      } else {
        progress.current = key === KONAMI_SEQUENCE[0] ? 1 : 0
      }
    }

    window.addEventListener('keydown', handler, { passive: true })
    return () => window.removeEventListener('keydown', handler)
  }, [])
}

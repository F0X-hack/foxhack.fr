import { useCallback, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import useKonami from '../hooks/useKonami'

/**
 * Easter egg #3 — Konami Code.
 * Uniquement visuel : affiche un toast, n'exécute rien, ne modifie rien.
 */
export default function EasterEggToast() {
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()

  const unlock = useCallback(() => {
    setOpen(true)
    window.setTimeout(() => setOpen(false), 6500)
  }, [])

  useKonami(unlock)

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[80] w-[min(92vw,26rem)] -translate-x-1/2"
        >
          <div className="term-window border-signal/30 shadow-glow">
            <div className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[0.68rem] uppercase tracking-widest2 text-signal-soft">
                  easter egg #3 — konami
                </p>
                <p className="mt-2 font-mono text-[0.72rem] text-bone">
                  ↑↑↓↓←→←→BA — root access granted?
                </p>
                <p className="mt-1 font-mono text-[0.68rem] text-dim">
                  No. But you clearly read the source. Keep breaking things — legally.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Dismiss easter egg"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] border border-white/[0.08] text-dim transition-colors hover:border-signal/40 hover:text-bone"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

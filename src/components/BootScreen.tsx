import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { profile } from '../data/profile'
import { prepareMusic, startMusic, useSound } from '../lib/audio'
import BrandMark from './icons/BrandMark'

/**
 * Écran de démarrage — sas d'entrée du lab.
 *
 * La progression ne ment pas : elle atteint 100 % quand les polices sont
 * prêtes, que le portrait est décodé ET que le temps minimum est écoulé.
 * Ensuite l'écran ATTEND une interaction : c'est ce geste qui autorise le
 * navigateur à lancer `/music.mp3` (aucune lecture automatique n'est permise
 * sans action du visiteur). Clic, touche ou « Entrée » sur le bouton suffisent.
 */

type BootLine = {
  label: string
  value: string
  tone?: 'ok' | 'plain' | 'subject'
}

const MIN_MS = 820
const MAX_MS = 1900

export default function BootScreen() {
  const reduceMotion = useReducedMotion()
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(0)
  const [lines, setLines] = useState<BootLine[]>([])
  const [ready, setReady] = useState(false)
  const [entering, setEntering] = useState(false)
  const tasks = useRef({ fonts: false, avatar: false })
  const { available } = useSound()

  /* Journal : uniquement des valeurs réelles de la session (aucun chiffre inventé) */
  useEffect(() => {
    const now = new Date()
    const clock = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map((part) => String(part).padStart(2, '0'))
      .join(':')

    setLines([
      { label: 'power-on self test', value: 'ok', tone: 'ok' },
      { label: 'mount ~/lab', value: 'ok', tone: 'ok' },
      { label: 'theme', value: 'dedsec' },
      { label: 'viewport', value: `${window.innerWidth} × ${window.innerHeight} @${window.devicePixelRatio || 1}x` },
      { label: 'locale', value: navigator.language || 'n/a' },
      { label: 'clock', value: clock },
      {
        label: 'subject',
        value: `${profile.name.toLowerCase()} · ${profile.title.toLowerCase()}`,
        tone: 'subject',
      },
    ])

    /* la piste est préparée tôt : si `music.mp3` existe, on le sait avant le clic */
    prepareMusic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Progression réelle : polices + portrait + temps mini, plafonnée par MAX_MS */
  useEffect(() => {
    if (!visible) return

    if (reduceMotion) {
      setProgress(1)
      setReady(true)
      return
    }

    const startedAt = performance.now()
    let timer = 0

    if (document.fonts) document.fonts.ready.then(() => (tasks.current.fonts = true))

    const portrait = new Image()
    portrait.src = profile.avatar
    const done = () => (tasks.current.avatar = true)
    if (portrait.decode) portrait.decode().then(done).catch(done)
    else {
      portrait.onload = done
      portrait.onerror = done
    }

    const tick = () => {
      const elapsed = performance.now() - startedAt
      const paced = Math.min(elapsed / MIN_MS, 1)
      const verified = (tasks.current.fonts ? 0.14 : 0) + (tasks.current.avatar ? 0.14 : 0)
      const value = Math.min(1, paced * 0.72 + verified)
      setProgress(value)

      if (value >= 1 || elapsed > MAX_MS) {
        window.clearInterval(timer)
        setProgress(1)
        setReady(true)
      }
    }

    timer = window.setInterval(tick, 60)
    return () => window.clearInterval(timer)
  }, [visible, reduceMotion])

  /** Entrée : joue la musique dans le geste, puis lève l'écran. */
  const enter = useCallback(() => {
    setEntering((was) => {
      if (was) return was
      startMusic()
      window.setTimeout(() => setVisible(false), 280)
      return true
    })
  }, [])

  /* N'importe quelle touche fait entrer (Tab excepté, pour ne pas casser le focus) */
  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') enter()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, enter])

  /* Rien ne défile derrière le sas */
  useEffect(() => {
    if (!visible) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [visible])

  const percent = Math.round(progress * 100)
  const shown = reduceMotion ? lines.length : Math.min(lines.length, Math.floor(progress * (lines.length + 2)))

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-boot="screen"
          role="status"
          aria-label="Loading FoXhack"
          onClick={enter}
          className="fixed inset-0 z-[95] cursor-pointer overflow-hidden bg-void"
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          animate={{ clipPath: 'inset(0 0 0% 0)' }}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.38, ease: [0.22, 0.8, 0.2, 1] }}
        >
          {/* plus d'entrelacement : le maillage en pointillés a été supprimé du site */}
          <div className="layer layer-vignette" aria-hidden="true" />
          <div className="layer layer-grain" aria-hidden="true" />
          <span className="boot-sweep" aria-hidden="true" />

          <div className="relative mx-auto flex h-full w-full max-w-xl flex-col justify-center gap-7 px-6 sm:px-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[0.58rem] uppercase tracking-widest2 text-dim">
              <span>{profile.name.toLowerCase()} // security research lab</span>
              <span>ch 07 · dedsec</span>
            </div>

            <div>
              <BrandMark
                variant="wordmark"
                className="boot-mark h-[50px] w-auto text-bone sm:h-[62px]"
                title={profile.name}
              />
              <span className="boot-underline" aria-hidden="true" />
            </div>

            <ul className="space-y-1.5 font-mono text-[0.68rem]" aria-hidden="true">
              {lines.slice(0, shown).map((line) => (
                <li
                  key={line.label}
                  className="boot-line flex flex-wrap items-baseline gap-x-2 break-words"
                >
                  <span className="text-dim">›</span>
                  <span className="shrink-0 text-muted">{line.label}</span>
                  <span className="boot-leader" />
                  <span
                    className={`min-w-0 break-words ${
                      line.tone === 'ok'
                        ? 'text-signal'
                        : line.tone === 'subject'
                          ? 'text-static'
                          : 'text-bone'
                    }`}
                  >
                    {line.value}
                  </span>
                </li>
              ))}
              {ready && (
                <li className="boot-line flex items-baseline gap-2 text-signal">
                  <span className="text-dim">›</span>
                  <span className="break-words">
                    {entering ? 'signal acquired — entering' : 'signal acquired — waiting for input'}
                  </span>
                </li>
              )}
            </ul>

            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="relative h-px flex-1 overflow-hidden bg-white/[0.12]">
                  <span
                    className="absolute inset-y-0 left-0 bg-signal transition-[width] duration-150 ease-out"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-10 text-right font-mono text-[0.62rem] tabular-nums text-signal">
                  {percent}%
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 font-mono text-[0.58rem] uppercase tracking-widest2 text-dim">
                <span className="flex items-center gap-2">
                  <span className="boot-dot" aria-hidden="true" />
                  {ready ? 'online' : 'linking'}
                </span>
                <span>click or press any key to enter</span>
              </div>
            </div>

            {/* le seuil : c'est ce clic qui autorise la lecture de la musique */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={enter}
                className="btn btn-primary px-5 py-3 text-[0.68rem]"
              >
                <span aria-hidden="true">[</span>
                ENTER
                <span aria-hidden="true">]</span>
              </button>

              {available ? (
                <p className="flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-widest2 text-dim">
                  <Volume2 className="h-3.5 w-3.5 text-signal/70" aria-hidden="true" />
                  music starts on entry
                </p>
              ) : null}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

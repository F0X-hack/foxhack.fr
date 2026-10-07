import { useCallback, useSyncExternalStore } from 'react'

/**
 * ============================================================================
 *  audio — musique de fond du lab.
 *
 *  Les navigateurs interdisent la lecture automatique : une piste ne peut
 *  démarrer que DANS un geste utilisateur. C'est l'écran de démarrage qui s'en
 *  charge — il attend le clic (ou une touche) et lance `/music.mp3` dans ce
 *  geste précis.
 *
 *  · hors navigateur (rendu SSR) : le module ne touche à rien ;
 *  · si `public/music.mp3` est absent : aucun son, aucun contrôle affiché,
 *    aucune exception (l'erreur de chargement est absorbée) ;
 *  · préférence « son » mémorisée dans localStorage (`foxhack:sound`).
 * ============================================================================
 */

/** Piste déposée dans `public/` → servie à la racine du site. */
const TRACK = '/music.mp3'
const STORAGE_KEY = 'foxhack:sound'
const TARGET_VOLUME = 0.32
const FADE_MS = 900

export type SoundState = {
  /** le visiteur veut du son (préférence mémorisée) */
  enabled: boolean
  /** la piste existe et est décodable */
  available: boolean
  /** lecture en cours */
  playing: boolean
}

const SERVER_STATE: SoundState = { enabled: true, available: false, playing: false }

let element: HTMLAudioElement | null = null
let fade: number | null = null
let state: SoundState = SERVER_STATE

const subscribers = new Set<() => void>()

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

function writePreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    /* stockage refusé : la préférence vaut pour la session */
  }
}

function publish(patch: Partial<SoundState>): void {
  state = { ...state, ...patch }
  for (const notify of subscribers) notify()
}

function subscribe(notify: () => void): () => void {
  subscribers.add(notify)
  return () => {
    subscribers.delete(notify)
  }
}

function getState(): SoundState {
  return state
}

if (typeof window !== 'undefined') {
  state = { enabled: readPreference(), available: false, playing: false }
}

/** Crée l'élément audio une seule fois et observe sa disponibilité. */
function ensureElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (element) return element

  const audio = new Audio(TRACK)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = 0
  audio.addEventListener('loadedmetadata', () => publish({ available: true }))
  /* fichier absent ou illisible : on reste silencieux, sans rien casser */
  audio.addEventListener('error', () => publish({ available: false }))
  audio.addEventListener('playing', () => publish({ playing: true }))
  audio.addEventListener('pause', () => publish({ playing: false }))
  element = audio
  return audio
}

/** Prépare la piste (métadonnées) sans rien jouer — appelable au montage. */
export function prepareMusic(): void {
  ensureElement()
}

function rampTo(target: number, done?: () => void): void {
  const audio = element
  if (!audio) return
  if (fade !== null) window.clearInterval(fade)

  const from = audio.volume
  const startedAt = performance.now()
  fade = window.setInterval(() => {
    const t = Math.min((performance.now() - startedAt) / FADE_MS, 1)
    audio.volume = Math.min(1, Math.max(0, from + (target - from) * t))
    if (t >= 1) {
      if (fade !== null) window.clearInterval(fade)
      fade = null
      done?.()
    }
  }, 40)
}

/**
 * Démarre la musique. À appeler DANS un gestionnaire de geste utilisateur
 * (clic, touche, appui) : c'est ce qui autorise la lecture.
 */
export function startMusic(): void {
  const audio = ensureElement()
  if (!audio || !state.enabled) return

  audio.volume = 0
  const attempt = audio.play()
  if (attempt && typeof attempt.then === 'function') {
    attempt.then(() => rampTo(TARGET_VOLUME)).catch(() => publish({ playing: false }))
  } else {
    rampTo(TARGET_VOLUME)
  }
}

/** Coupe ou relance la musique, et mémorise le choix. */
export function toggleSound(): void {
  const audio = ensureElement()
  if (!audio) return

  const next = !(state.enabled && state.playing)
  writePreference(next)
  publish({ enabled: next })

  if (next) {
    const attempt = audio.play()
    if (attempt && typeof attempt.then === 'function') {
      attempt.then(() => rampTo(TARGET_VOLUME)).catch(() => publish({ playing: false }))
    } else {
      rampTo(TARGET_VOLUME)
    }
  } else {
    rampTo(0, () => audio.pause())
  }
}

/** État du son, réactif, utilisable dans n'importe quel composant. */
export function useSound(): SoundState & { toggle: () => void } {
  const snapshot = useSyncExternalStore(subscribe, getState, () => SERVER_STATE)
  const toggle = useCallback(() => toggleSound(), [])
  return { ...snapshot, toggle }
}

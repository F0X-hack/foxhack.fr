import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Menu, Volume2, VolumeX, X } from 'lucide-react'
import BrandMark from './icons/BrandMark'
import { navLinks } from '../data/navigation'
import useScrollSpy from '../lib/scrollSpy'
import { useSound } from '../lib/audio'
import { profile } from '../data/profile'

/** Ids des sections suivies par le scroll-spy (référence stable pour le hook). */
const NAV_IDS = navLinks.map((link) => link.id)

/**
 * Navbar fixe : transparente + blur,
 * scroll-spy et contrôle du son.
 */
export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const reduceMotion = useReducedMotion()
  const { active, select } = useScrollSpy(NAV_IDS)
  const sound = useSound()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  /* Contrôle du son : affiché seulement si une piste est réellement chargée */
  const soundButton = sound.available ? (
    <button
      type="button"
      onClick={sound.toggle}
      className="group flex h-11 items-center gap-2 border border-white/[0.12] bg-white/[0.015] px-3 font-mono text-[0.6rem] uppercase tracking-widest2 text-muted transition-colors hover:border-signal/50 hover:text-bone"
      aria-pressed={sound.enabled && sound.playing}
      aria-label={sound.enabled && sound.playing ? 'Mute background music' : 'Play background music'}
      title={sound.enabled && sound.playing ? 'sound: on' : 'sound: off'}
    >
      {sound.enabled && sound.playing ? (
        <Volume2 className="h-3.5 w-3.5 text-signal/70" aria-hidden="true" />
      ) : (
        <VolumeX className="h-3.5 w-3.5 text-dim" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{sound.enabled && sound.playing ? 'SOUND' : 'MUTED'}</span>
    </button>
  ) : null

  return (
    <header
      className={`safe-top fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'border-b border-white/[0.08] bg-void/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <nav className="shell flex h-[68px] items-center justify-between gap-4" aria-label="Main">
        {/* identité */}
        <a
          href="#top"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label={`${profile.name} — back to top`}
        >
          {/* wordmark dessiné (vectoriel, suit la couleur du thème) */}
          <BrandMark
            variant="wordmark"
            className="h-[26px] w-auto text-bone transition-colors group-hover:text-white sm:h-7"
            title={`${profile.name} — home`}
          />

        </a>

        {/* liens desktop */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {navLinks.map((link) => {
            const isActive = active === link.id
            return (
              <a
                key={link.id}
                href={link.href}
                onClick={() => select(link.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`relative px-2.5 py-2 font-mono text-[0.66rem] uppercase tracking-widest2 transition-colors ${
                  isActive ? 'text-bone' : 'text-muted hover:text-bone'
                }`}
              >
                <span aria-hidden="true" className={isActive ? 'text-signal' : 'text-transparent'}>
                  [
                </span>
                <span className="px-1">{link.label}</span>
                <span aria-hidden="true" className={isActive ? 'text-signal' : 'text-transparent'}>
                  ]
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-2 bottom-0 h-px origin-left transition-transform duration-300 ${
                    isActive ? 'scale-x-100 bg-signal/70' : 'scale-x-0 bg-white/25'
                  }`}
                />
              </a>
            )
          })}

          {soundButton}

          <a href="#contact" className="btn btn-primary ml-2 px-4 py-2.5 text-[0.66rem]">
            <span aria-hidden="true">[</span>
            CONTACT
            <span aria-hidden="true">]</span>
          </a>
        </div>

        {/* mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          {soundButton}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center border border-white/[0.12] text-bone transition-colors hover:border-signal/50"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="border-t border-white/[0.08] bg-void/95 backdrop-blur-xl lg:hidden"
          >
            <div className="shell flex flex-col py-4">
              {navLinks.map((link, index) => {
                const isActive = active === link.id
                return (
                  <a
                    key={link.id}
                    href={link.href}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => {
                      select(link.id)
                      setOpen(false)
                    }}
                    className={`flex min-h-[52px] items-center justify-between border-b border-white/[0.05] font-mono text-xs uppercase tracking-widest2 transition-colors ${
                      isActive ? 'text-bone' : 'text-muted hover:text-bone'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={`w-6 font-mono text-[0.62rem] ${isActive ? 'text-signal' : 'text-dim'}`}
                        aria-hidden="true"
                      >
                        {isActive ? '[' : String(index + 1).padStart(2, '0')}
                      </span>
                      {link.label}
                    </span>
                    <span
                      className={`font-mono text-[0.62rem] ${isActive ? 'text-signal' : 'text-dim'}`}
                      aria-hidden="true"
                    >
                      {isActive ? '] ON' : '→'}
                    </span>
                  </a>
                )
              })}
              <a href="#contact" onClick={() => setOpen(false)} className="btn btn-primary mt-4 w-full">
                <span aria-hidden="true">[</span>
                CONTACT
                <span aria-hidden="true">]</span>
              </a>
              <p className="mt-4 flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-widest2 text-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden="true" /> online —
                security research lab
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

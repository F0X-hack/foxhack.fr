import { useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import Spotlight from './ui/Spotlight'

/**
 * Fond du site — « scène éclairée par projecteurs ».
 *
 * Trois cônes fixes posés sur le noir profond : un principal qui éclaire le
 * haut de page, un froid à droite, un très bas à gauche pour tenir le bas de
 * page. Le vignettage est ce qui fait lire les cônes : il reste fort.
 *
 * On garde la poussière dans la lumière et un grain fin — l'héritage « canal »
 * du site, mais sans bande VHS, sans balayage ni entrelacement CRT : ce dernier
 * dessinait un quadrillage de points autour des portraits.
 *
 * Tout est en dégradés CSS : aucun asset, aucun WebGL, aucun filtre coûteux.
 */
export default function Background() {
  const reduceMotion = useReducedMotion()

  const dust = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => {
        const seed = (index * 9301 + 49297) % 233280
        const a = seed / 233280
        const b = ((index * 4177 + 12345) % 99991) / 99991
        const c = ((index * 7717 + 104729) % 65537) / 65537
        return {
          left: `${(a * 100).toFixed(2)}%`,
          top: `${(b * 100).toFixed(2)}%`,
          size: c > 0.84 ? 2 : 1,
          duration: 18 + Math.round(a * 22),
          delay: `-${(b * 26).toFixed(2)}s`,
          opacity: 0.12 + b * 0.26,
        }
      }),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* cône principal : éclaire le hero et le haut de page */}
      <Spotlight
        tone="signal"
        intensity="ambient"
        drift
        className="left-1/2 top-[-22rem] h-[58rem] w-[108rem] -translate-x-1/2"
      />
      {/* cœur du cône : source unique, plus nette */}
      <Spotlight
        tone="signal"
        intensity="core"
        drift
        className="left-1/2 top-[-14rem] h-[30rem] w-[54rem] -translate-x-1/2"
      />
      {/* cône froid : respiration à droite, réveille les sections médianes */}
      <Spotlight
        tone="static"
        intensity="ambient"
        drift
        className="right-[-16rem] top-[38%] h-[38rem] w-[38rem]"
      />
      {/* cône bas-gauche : tient le pied de page */}
      <Spotlight
        tone="signal"
        intensity="ambient"
        drift
        className="bottom-[-12rem] left-[-10rem] h-[38rem] w-[38rem]"
      />

      {/* la grille ne s'allume que dans le cône principal */}
      <div className="layer layer-grid" />

      {!reduceMotion && (
        <div className="layer">
          {/* poussière en suspension dans la lumière */}
          {dust.map((mote, index) => (
            <span
              key={index}
              className="dust"
              style={{
                left: mote.left,
                top: mote.top,
                width: mote.size,
                height: mote.size,
                opacity: mote.opacity,
                animationDuration: `${mote.duration}s`,
                animationDelay: mote.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Plus d'entrelacement CRT : son maillage 1 px tous les 3-4 px formait un
          quadrillage de points très visible autour du portrait de whoami (la
          grille 76 px, elle, reste quasi invisible). Vignettage + grain suffisent. */}
      <div className="layer layer-vignette" />
      <div className="layer layer-grain" />
    </div>
  )
}

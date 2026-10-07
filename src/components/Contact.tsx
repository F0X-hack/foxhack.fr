import SectionHeading from './ui/SectionHeading'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import BrandIcon from './icons/BrandIcon'
import { profile } from '../data/profile'
import type { SocialIconKey } from '../data/socials'
import Spotlight from './ui/Spotlight'

const CHANNELS: { label: string; href: string; icon: SocialIconKey }[] = [
  { label: 'GITHUB', href: 'https://github.com/F0X-hack', icon: 'github' },
  { label: 'INSTAGRAM', href: 'https://www.instagram.com/foxhxck', icon: 'instagram' },
  { label: 'TIKTOK', href: 'https://www.tiktok.com/@f.o.x_zero', icon: 'tiktok' },
]

export default function Contact() {
  return (
    <section data-spot="contact" id="contact" className="section scroll-mt-24 pt-0">
      <Spotlight
        tone="signal"
        intensity="low"
        className="bottom-[-8rem] left-1/2 h-[30rem] w-[46rem] -translate-x-1/2"
      />

      <div className="shell">
        <div className="panel relative overflow-hidden px-6 py-12 sm:px-10 sm:py-14">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_140%_at_50%_120%,rgb(var(--signal)/0.12),transparent_62%)]"
          />
          {/* repères d'angle */}
          <span aria-hidden="true" className="absolute left-3 top-3 h-5 w-5 border-l border-t border-white/15" />
          <span aria-hidden="true" className="absolute right-3 top-3 h-5 w-5 border-r border-t border-white/15" />
          <span aria-hidden="true" className="absolute bottom-3 left-3 h-5 w-5 border-b border-l border-white/15" />
          <span aria-hidden="true" className="absolute bottom-3 right-3 h-5 w-5 border-b border-r border-white/15" />

          <div className="relative">
            <SectionHeading
              title={profile.contact.title}
              align="center"
            />

            <Reveal delay={0.1} className="mt-10">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {CHANNELS.map((channel) => (
                  <MagneticButton key={channel.label} href={channel.href} external variant="ghost">
                    <BrandIcon name={channel.icon} className="h-4 w-4" />
                    {channel.label}
                  </MagneticButton>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

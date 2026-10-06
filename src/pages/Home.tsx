import Navbar from '../components/Navbar'
import Background from '../components/Background'
import BootScreen from '../components/BootScreen'
import EasterEggToast from '../components/EasterEggToast'
import Hero from '../components/Hero'
import About from '../components/About'
import Skills from '../components/Skills'
import Projects from '../components/Projects'
import GitHubSection from '../components/GitHubSection'
import CTF from '../components/CTF'
import Socials from '../components/Socials'
import Contact from '../components/Contact'
import Footer from '../components/Footer'
import useSpotlightFocus from '../hooks/useSpotlightFocus'

/**
 * Le lab personnel de FoXhack — une seule page, lue comme une session
 * de diffusion : bandeau de signal, couches numérotées, sections numérotées.
 * Site purement statique : aucune fonctionnalité offensive réelle.
 */
export default function Home() {
  useSpotlightFocus()

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <Background />
      <BootScreen />
      <EasterEggToast />
      <Navbar />

      <main id="main">
        <Hero />
        <About />
        <Skills />
        <Projects />
        <GitHubSection />
        <CTF />
        <Socials />
        <Contact />
      </main>

      <Footer />
    </>
  )
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { missingSlashTarget } from './lib/sectionUrl'

/* Le visiteur qui a écrit `foxhack.fr/offsidian` sans slash final a peut-être
   reçu cette page d'accueil à la place d'Offsidian (fallback SPA de
   l'hébergeur). On recolle le slash avant de monter quoi que ce soit. */
const redirect = missingSlashTarget(window.location.pathname, window.location.search, window.location.hash)

if (redirect) {
  window.location.replace(redirect)
} else {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

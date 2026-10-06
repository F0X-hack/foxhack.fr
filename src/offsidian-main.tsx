import React from 'react'
import ReactDOM from 'react-dom/client'
/* Le CSS du portfolio n'est pas chargé ici : `offsidian.css` embarque son
   propre reset, ce qui retire ~46 Ko de styles inutilisés de cette page. */
import './offsidian/offsidian.css'
import OffsidianApp from './offsidian/OffsidianApp'

ReactDOM.createRoot(document.getElementById('offsidian-root') as HTMLElement).render(
  <React.StrictMode>
    <OffsidianApp />
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './offsidian/offsidian.css'
import OffsidianApp from './offsidian/OffsidianApp'

ReactDOM.createRoot(document.getElementById('offsidian-root') as HTMLElement).render(
  <React.StrictMode>
    <OffsidianApp />
  </React.StrictMode>,
)

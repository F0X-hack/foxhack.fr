import React from 'react'
import ReactDOM from 'react-dom/client'
import RevshellPage from './tools/RevshellPage'
import './index.css'
import './tools/tools.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RevshellPage />
  </React.StrictMode>,
)

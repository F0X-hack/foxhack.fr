import React from 'react'
import ReactDOM from 'react-dom/client'
import CidrPage from './tools/CidrPage'
import './index.css'
import './tools/tools.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <CidrPage />
  </React.StrictMode>,
)

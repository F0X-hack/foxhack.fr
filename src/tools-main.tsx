import React from 'react'
import ReactDOM from 'react-dom/client'
import ToolsPage from './tools/ToolsPage'
import './index.css'
import './tools/tools.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ToolsPage />
  </React.StrictMode>,
)

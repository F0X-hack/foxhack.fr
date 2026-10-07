import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function canonicalToolLocation(url: string | undefined): string | null {
  if (!url) return null
  const [pathname, ...queryParts] = url.split('?')
  if (pathname !== '/tools' && pathname !== '/tools/revshell' && pathname !== '/tools/cidr') return null
  const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : ''
  return `${pathname}/${query}`
}

const canonicalToolRoutes: Plugin = {
  name: 'canonical-tool-routes',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const location = canonicalToolLocation(request.url)
      if (!location) return next()
      response.statusCode = 301
      response.setHeader('Location', location)
      response.end()
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const location = canonicalToolLocation(request.url)
      if (!location) return next()
      response.statusCode = 301
      response.setHeader('Location', location)
      response.end()
    })
  },
}

export default defineConfig({
  plugins: [react(), canonicalToolRoutes],
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        offsidian: resolve(__dirname, 'offsidian/index.html'),
        tools: resolve(__dirname, 'tools/index.html'),
        revshell: resolve(__dirname, 'tools/revshell/index.html'),
        cidr: resolve(__dirname, 'tools/cidr/index.html'),
      },
    },
  },
})

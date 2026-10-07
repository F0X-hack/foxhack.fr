import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Pages du labo servies en dossier : `/reaper` → `/reaper/`.
    Mêmes règles que `public/_redirects` et `deploy/nginx-foxhack.conf`. */
const canonicalPages = [
  '/offsidian',
  '/evilfox',
  '/reaper',
  '/foxhid',
  '/mfkey32',
  '/tools',
] as const

function canonicalPageLocation(url: string | undefined): string | null {
  if (!url) return null
  const [pathname, ...queryParts] = url.split('?')
  const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : ''
  if (pathname === '/mfkey32/index.html') return `/mfkey32/${query}`
  if (!(canonicalPages as readonly string[]).includes(pathname)) return null
  return `${pathname}/${query}`
}

const canonicalPageRoutes: Plugin = {
  name: 'canonical-page-routes',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const location = canonicalPageLocation(request.url)
      if (!location) return next()
      response.statusCode = 301
      response.setHeader('Location', location)
      response.end()
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const location = canonicalPageLocation(request.url)
      if (!location) return next()
      response.statusCode = 301
      response.setHeader('Location', location)
      response.end()
    })
  },
}

/** Pages statiques de `public/` (une page par dossier, sans build Vite).
    En production l'hôte sert `<dossier>/index.html` ; ici il faut le faire
    nous-mêmes, sinon `/mfkey32/` retombe sur l'accueil du portfolio. */
const staticPageDirs = ['evilfox', 'foxhid', 'reaper', 'mfkey32'] as const

function staticPageHandler(
  request: { url?: string },
  response: unknown,
  next: () => void,
) {
  const url = request.url ? new URL(request.url, 'http://vite.local') : null
  const match = url ? /^\/([a-z0-9-]+)\/$/.exec(url.pathname) : null
  if (!match || !(staticPageDirs as readonly string[]).includes(match[1])) return next()
  request.url = `/${match[1]}/index.html${url!.search}`
  return next()
}

const staticPageRoutes: Plugin = {
  name: 'static-page-routes',
  configureServer(server) {
    server.middlewares.use(staticPageHandler)
  },
  configurePreviewServer(server) {
    server.middlewares.use(staticPageHandler)
  },
}

export default defineConfig({
  plugins: [react(), canonicalPageRoutes, staticPageRoutes],
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
      },
    },
  },
})

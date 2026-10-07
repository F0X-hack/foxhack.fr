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

const revshellRawEndpoint: Plugin = {
  name: 'revshell-raw-endpoint',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = request.url ? new URL(request.url, 'http://vite.local') : null
      if (url?.pathname !== '/tools/revshell/raw') return next()
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.statusCode = 405
        response.setHeader('Allow', 'GET, HEAD')
        response.end('Method not allowed.\n')
        return
      }
      const value = url.searchParams.get('value')
      if (value === null) {
        response.statusCode = 400
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end('Missing value query parameter.\n')
        return
      }
      response.statusCode = 200
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.end(request.method === 'HEAD' ? '' : value)
    })
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, response, next) => {
      const url = request.url ? new URL(request.url, 'http://vite.local') : null
      if (url?.pathname !== '/tools/revshell/raw') return next()
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.statusCode = 405
        response.setHeader('Allow', 'GET, HEAD')
        response.end('Method not allowed.\n')
        return
      }
      const value = url.searchParams.get('value')
      if (value === null) {
        response.statusCode = 400
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end('Missing value query parameter.\n')
        return
      }
      response.statusCode = 200
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Content-Type-Options', 'nosniff')
      response.end(request.method === 'HEAD' ? '' : value)
    })
  },
}

export default defineConfig({
  plugins: [react(), canonicalToolRoutes, revshellRawEndpoint],
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

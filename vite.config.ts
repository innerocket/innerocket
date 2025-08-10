import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import lucidePreprocess from 'vite-plugin-lucide-preprocess'
import Sitemap from 'vite-plugin-sitemap'
import type { Plugin } from 'vite'

function inlineCloudflareBeacon(token?: string): Plugin {
  let beaconContent = ''

  return {
    name: 'inline-cloudflare-beacon',
    async buildStart() {
      try {
        const response = await fetch('https://static.cloudflareinsights.com/beacon.min.js')
        if (response.ok) {
          beaconContent = await response.text()
        }
      } catch (error) {
        console.warn('Failed to fetch Cloudflare beacon:', error)
      }
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // token is passed as parameter now

        if (!beaconContent || !token) {
          return html
        }

        // Inject Cloudflare analytics before </head>
        const cloudflareScript = `
    <script defer data-cf-beacon='{"token": "${token}"}'>${beaconContent}</script>`

        return html.replace('</head>', `${cloudflareScript}\n  </head>`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const cloudflareToken = env.VITE_CLOUDFLARE_ANALYTICS_TOKEN

  return {
    plugins: [
      solid(),
      tailwindcss(),
      lucidePreprocess(),
      inlineCloudflareBeacon(cloudflareToken),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'apple-touch-icon.png', 'images/*.png'],
        manifest: {
          name: 'Innerocket',
          short_name: 'Innerocket',
          description: 'File sharing with rocket speed and privacy.',
          start_url: '/',
          display: 'standalone',
          background_color: '#ffffff',
          theme_color: '#0969DA',
          icons: [
            {
              src: '/images/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/images/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
      ViteMinifyPlugin({
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: false,
      }),
      Sitemap({
        hostname: env.VITE_SITE_URL || 'https://innerocket.com',
      }),
    ],
    build: {
      minify: 'terser',
    },
  }
})

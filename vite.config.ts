import { defineConfig, loadEnv, type UserConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import lucidePreprocess from 'vite-plugin-lucide-preprocess'
import Sitemap from 'vite-plugin-sitemap'
import { inlineCloudflareBeacon } from './src/utils/cloudflareBeacon'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  if (mode === 'test') {
    return {
      test: {
        environment: 'node',
        globals: true,
      },
    } as UserConfig
  }

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
  } as UserConfig
})

import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { ViteMinifyPlugin } from 'vite-plugin-minify'
import lucidePreprocess from 'vite-plugin-lucide-preprocess'
import Sitemap from 'vite-plugin-sitemap'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    solid(),
    tailwindcss(),
    lucidePreprocess(),
    VitePWA({
      registerType: 'autoUpdate',
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
      hostname: process.env.VITE_SITE_URL || 'https://innerocket.com',
    }),
  ],
  build: {
    minify: 'terser',
  },
})

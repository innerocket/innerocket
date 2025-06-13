import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { ViteMinifyPlugin } from 'vite-plugin-minify';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
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
  ],
  build: {
    minify: 'terser',
  },
});

import type { Plugin } from 'vite'

export function inlineCloudflareBeacon(token?: string): Plugin {
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
        if (!beaconContent || !token) {
          return html
        }

        // Inject Cloudflare analytics before </head>
        const cloudflareScript = `
    <script data-cf-beacon='{"token": "${token}"}'>${beaconContent}</script>`

        return html.replace('</head>', `${cloudflareScript}\n  </head>`)
      },
    },
  }
}

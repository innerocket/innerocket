export interface AnalyticsConfig {
  googleAnalyticsId?: string
  cloudflareAnalyticsToken?: string
  isProduction: boolean
  doNotTrack: boolean
}

export function getAnalyticsConfig(): AnalyticsConfig {
  const googleAnalyticsId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID as string | undefined
  const cloudflareAnalyticsToken = import.meta.env.VITE_CLOUDFLARE_ANALYTICS_TOKEN as
    | string
    | undefined
  const nodeEnv = import.meta.env.MODE

  const isProduction = nodeEnv === 'production'
  const doNotTrack =
    navigator.doNotTrack === '1' ||
    (window as typeof window & { doNotTrack?: string }).doNotTrack === '1'

  return {
    googleAnalyticsId: googleAnalyticsId?.trim() || undefined,
    cloudflareAnalyticsToken: cloudflareAnalyticsToken?.trim() || undefined,
    isProduction,
    doNotTrack,
  }
}

export function shouldLoadGoogleAnalytics(config: AnalyticsConfig): boolean {
  return !!(config.googleAnalyticsId && config.isProduction && !config.doNotTrack)
}

export function shouldLoadCloudflareAnalytics(): boolean {
  return false // Disabled: Cloudflare analytics is now inlined at build time
}

export function injectGoogleAnalytics(googleAnalyticsId: string): void {
  const gtag = document.createElement('script')
  gtag.async = true
  gtag.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`

  const gtagConfig = document.createElement('script')
  gtagConfig.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${googleAnalyticsId}', {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  `

  document.head.appendChild(gtag)
  document.head.appendChild(gtagConfig)
}

export function injectCloudflareAnalytics(token: string): void {
  const script = document.createElement('script')
  script.defer = true
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js'
  script.setAttribute('data-cf-beacon', `{"token": "${token}"}`)

  document.head.appendChild(script)
}

export function initializeAnalytics(): void {
  const config = getAnalyticsConfig()

  if (shouldLoadGoogleAnalytics(config)) {
    injectGoogleAnalytics(config.googleAnalyticsId!)
  }

  if (shouldLoadCloudflareAnalytics()) {
    injectCloudflareAnalytics(config.cloudflareAnalyticsToken!)
  }
}

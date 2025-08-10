import { render } from 'solid-js/web'

import './index.css'
import { App } from './app'
import { PeerProvider } from './contexts/PeerContext'
import { initializeAnalytics } from './utils/analytics'

const root = document.getElementById('app')

initializeAnalytics()

if (root) {
  render(
    () => (
      <PeerProvider>
        <App />
      </PeerProvider>
    ),
    root
  )
}

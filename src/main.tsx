import { render } from 'solid-js/web'

import './index.css'
import { App } from './app'
import { PeerProvider } from './contexts/PeerContext'
import { initializeAnalytics } from './utils/analytics'
import { migrateSecureStorageData } from './migrations/secureStorageMigration'

const root = document.getElementById('app')

initializeAnalytics()
void migrateSecureStorageData()

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

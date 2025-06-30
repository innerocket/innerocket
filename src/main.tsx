import { render } from 'solid-js/web'

import './index.css'
import { App } from './app'
import { PeerProvider } from './contexts/PeerContext'

const root = document.getElementById('app')

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

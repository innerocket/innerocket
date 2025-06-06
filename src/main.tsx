import { render } from 'preact';
import './index.css';
import { App } from './app';
import { PeerProvider } from './contexts/PeerContext';

render(
  <PeerProvider>
    <App />
  </PeerProvider>,
  document.getElementById('app')!
);

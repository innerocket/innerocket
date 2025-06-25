import { useContext } from 'preact/hooks'
import { PeerContext } from '../contexts/PeerContextType'

// Custom hook to use the peer context
export function usePeer() {
  const context = useContext(PeerContext)
  if (context === undefined) {
    throw new Error('usePeer must be used within a PeerProvider')
  }
  return context
}

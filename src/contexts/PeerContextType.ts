import { createContext } from 'preact'

// Define the type for our context
export type PeerContextType = {
  peerId: string // User-facing ID (without prefix)
  getInternalPeerId: () => string // Internal ID (with prefix) for PeerJS
  setPeerId: (id: string) => void
  resetPeerId: () => void
  addPrefixToId: (id: string) => string // Convert user ID to internal ID
  removePrefixFromId: (id: string) => string // Convert internal ID to user ID
}

// Create the context with a default value
export const PeerContext = createContext<PeerContextType | undefined>(undefined)

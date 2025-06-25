import { useState, useEffect } from 'preact/hooks'
import {
  addServicePrefix,
  removeServicePrefix,
  isValidSqldsId,
  generateSqldsId,
} from '../utils/peerUtils'
import type { PeerContextType } from './PeerContextType'
import { PeerContext } from './PeerContextType'

// Storage key for the peer ID
const PEER_ID_STORAGE_KEY = 'innerocket_peer_id'

// Provider component
export function PeerProvider({ children }: { children: preact.ComponentChildren }) {
  // Initialize state from localStorage or generate a new sqlds ID
  const [peerId, setPeerId] = useState<string>(() => {
    const savedPeerId = localStorage.getItem(PEER_ID_STORAGE_KEY)

    if (savedPeerId && process.env.NODE_ENV === 'development') {
      console.log('Found saved peer ID:', savedPeerId)
      console.log('ID length:', savedPeerId.length)
      console.log('Is valid Sqlds ID:', isValidSqldsId(savedPeerId))
    }

    // If no saved ID or the saved ID is not in the expected format, generate a new one
    if (!savedPeerId || !isValidSqldsId(savedPeerId)) {
      const newId = generateSqldsId()
      if (process.env.NODE_ENV === 'development') {
        console.log('Generated new peer ID:', newId)
        console.log('New ID length:', newId.length)

        // Log the reason for regeneration
        if (savedPeerId && !isValidSqldsId(savedPeerId)) {
          console.log(
            'Old ID format detected and regenerated for compatibility:',
            `"${savedPeerId}" -> "${newId}"`
          )
        }
      }

      // Update localStorage immediately with the new ID
      localStorage.setItem(PEER_ID_STORAGE_KEY, newId)
      return newId
    }

    // Always store the clean ID (without prefix) in state and localStorage
    const cleanId = removeServicePrefix(savedPeerId)
    if (cleanId !== savedPeerId) {
      localStorage.setItem(PEER_ID_STORAGE_KEY, cleanId)
    }
    return cleanId
  })

  // Save to localStorage whenever peerId changes
  useEffect(() => {
    localStorage.setItem(PEER_ID_STORAGE_KEY, peerId)
  }, [peerId])

  // Function to reset the peer ID
  const resetPeerId = () => {
    setPeerId(generateSqldsId())
  }

  // Function to get internal peer ID with prefix for PeerJS
  const getInternalPeerId = (): string => {
    return addServicePrefix(peerId)
  }

  // Function to add prefix to any ID
  const addPrefixToId = (id: string): string => {
    return addServicePrefix(id)
  }

  // Function to remove prefix from any ID
  const removePrefixFromId = (id: string): string => {
    return removeServicePrefix(id)
  }

  // Create the context value object
  const contextValue: PeerContextType = {
    peerId, // User-facing ID (clean, without prefix)
    getInternalPeerId,
    setPeerId,
    resetPeerId,
    addPrefixToId,
    removePrefixFromId,
  }

  return <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>
}

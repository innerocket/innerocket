import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import Sqlds from 'sqids';

const sqlds = new Sqlds();

// Service prefix for PeerJS IDs to avoid conflicts
const SERVICE_PREFIX = 'innerocket-';

// Define the type for our context
type PeerContextType = {
  peerId: string; // User-facing ID (without prefix)
  getInternalPeerId: () => string; // Internal ID (with prefix) for PeerJS
  setPeerId: (id: string) => void;
  resetPeerId: () => void;
  addPrefixToId: (id: string) => string; // Convert user ID to internal ID
  removePrefixFromId: (id: string) => string; // Convert internal ID to user ID
};

// Create the context with a default value
const PeerContext = createContext<PeerContextType | undefined>(undefined);

// Storage key for the peer ID
const PEER_ID_STORAGE_KEY = 'innerocket_peer_id';

// Helper functions for ID transformation
const addServicePrefix = (id: string): string => {
  if (id.startsWith(SERVICE_PREFIX)) {
    return id;
  }
  return SERVICE_PREFIX + id;
};

const removeServicePrefix = (id: string): string => {
  if (id.startsWith(SERVICE_PREFIX)) {
    return id.substring(SERVICE_PREFIX.length);
  }
  return id;
};

// Function to validate if an ID is in the expected Sqids format
const isValidSqldsId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;

  // Remove prefix for validation if present
  const cleanId = removeServicePrefix(id);

  // Check if it's a UUID format (with dashes) - these should be regenerated
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(cleanId)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Detected UUID format ID, will regenerate');
    }
    return false;
  }

  // Check if it's a NanoID format (typically 21 characters, URL-safe)
  // NanoIDs contain A-Za-z0-9_- and are usually 21 characters
  if (cleanId.length === 21 && /^[A-Za-z0-9_-]+$/.test(cleanId)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Detected NanoID format ID, will regenerate');
    }
    return false;
  }

  // Check for other long IDs that might be from previous formats
  if (cleanId.length > 18) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Detected long ID format, will regenerate');
    }
    return false;
  }

  // Sqids uses a default alphabet: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
  // The IDs should only contain these characters
  const sqldsAlphabetPattern = /^[a-zA-Z0-9]+$/;

  // Accept IDs that are within a reasonable length range and use the Sqids alphabet
  const isValidLength = cleanId.length >= 1 && cleanId.length <= 18;
  const hasValidCharacters = sqldsAlphabetPattern.test(cleanId);

  const isValid = isValidLength && hasValidCharacters;

  if (!isValid && process.env.NODE_ENV === 'development') {
    console.log('ID validation failed:', {
      id: cleanId,
      length: cleanId.length,
      validLength: isValidLength,
      validCharacters: hasValidCharacters,
    });
  }

  return isValid;
};

// Function to generate a new Sqlds ID
const generateSqldsId = (): string => {
  return sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)]);
};

// Provider component
export function PeerProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  // Initialize state from localStorage or generate a new sqlds ID
  const [peerId, setPeerId] = useState<string>(() => {
    const savedPeerId = localStorage.getItem(PEER_ID_STORAGE_KEY);

    if (savedPeerId && process.env.NODE_ENV === 'development') {
      console.log('Found saved peer ID:', savedPeerId);
      console.log('ID length:', savedPeerId.length);
      console.log('Is valid Sqlds ID:', isValidSqldsId(savedPeerId));
    }

    // If no saved ID or the saved ID is not in the expected format, generate a new one
    if (!savedPeerId || !isValidSqldsId(savedPeerId)) {
      const newId = generateSqldsId();
      if (process.env.NODE_ENV === 'development') {
        console.log('Generated new peer ID:', newId);
        console.log('New ID length:', newId.length);

        // Log the reason for regeneration
        if (savedPeerId && !isValidSqldsId(savedPeerId)) {
          console.log(
            'Old ID format detected and regenerated for compatibility:',
            `"${savedPeerId}" -> "${newId}"`
          );
        }
      }

      // Update localStorage immediately with the new ID
      localStorage.setItem(PEER_ID_STORAGE_KEY, newId);
      return newId;
    }

    // Always store the clean ID (without prefix) in state and localStorage
    const cleanId = removeServicePrefix(savedPeerId);
    if (cleanId !== savedPeerId) {
      localStorage.setItem(PEER_ID_STORAGE_KEY, cleanId);
    }
    return cleanId;
  });

  // Save to localStorage whenever peerId changes
  useEffect(() => {
    localStorage.setItem(PEER_ID_STORAGE_KEY, peerId);
  }, [peerId]);

  // Function to reset the peer ID
  const resetPeerId = () => {
    setPeerId(generateSqldsId());
  };

  // Function to get internal peer ID with prefix for PeerJS
  const getInternalPeerId = (): string => {
    return addServicePrefix(peerId);
  };

  // Function to add prefix to any ID
  const addPrefixToId = (id: string): string => {
    return addServicePrefix(id);
  };

  // Function to remove prefix from any ID
  const removePrefixFromId = (id: string): string => {
    return removeServicePrefix(id);
  };

  // Create the context value object
  const contextValue: PeerContextType = {
    peerId, // User-facing ID (clean, without prefix)
    getInternalPeerId,
    setPeerId,
    resetPeerId,
    addPrefixToId,
    removePrefixFromId,
  };

  return (
    <PeerContext.Provider value={contextValue}>{children}</PeerContext.Provider>
  );
}

// Custom hook to use the peer context
export function usePeer() {
  const context = useContext(PeerContext);
  if (context === undefined) {
    throw new Error('usePeer must be used within a PeerProvider');
  }
  return context;
}

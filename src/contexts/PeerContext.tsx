import { createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import Sqlds from 'sqids';

const sqlds = new Sqlds();

// Define the type for our context
type PeerContextType = {
  peerId: string;
  setPeerId: (id: string) => void;
  resetPeerId: () => void;
};

// Create the context with a default value
const PeerContext = createContext<PeerContextType | undefined>(undefined);

// Storage key for the peer ID
const PEER_ID_STORAGE_KEY = 'innerocket_peer_id';

// Function to validate if an ID is in the expected Sqids format
const isValidSqldsId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false;

  // Check if it's a UUID format (with dashes) - these should be regenerated
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Detected UUID format ID, will regenerate');
    }
    return false;
  }

  // Check if it's a NanoID format (typically 21 characters, URL-safe)
  // NanoIDs contain A-Za-z0-9_- and are usually 21 characters
  if (id.length === 21 && /^[A-Za-z0-9_-]+$/.test(id)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Detected NanoID format ID, will regenerate');
    }
    return false;
  }

  // Check for other long IDs that might be from previous formats
  if (id.length > 18) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Detected long ID format, will regenerate');
    }
    return false;
  }

  // Sqids uses a default alphabet: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
  // The IDs should only contain these characters
  const sqldsAlphabetPattern = /^[a-zA-Z0-9]+$/;

  // Accept IDs that are within a reasonable length range and use the Sqids alphabet
  const isValidLength = id.length >= 1 && id.length <= 18;
  const hasValidCharacters = sqldsAlphabetPattern.test(id);

  const isValid = isValidLength && hasValidCharacters;

  if (!isValid && process.env.NODE_ENV === 'development') {
    console.log('ID validation failed:', {
      id,
      length: id.length,
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

    return savedPeerId;
  });

  // Save to localStorage whenever peerId changes
  useEffect(() => {
    localStorage.setItem(PEER_ID_STORAGE_KEY, peerId);
  }, [peerId]);

  // Function to reset the peer ID
  const resetPeerId = () => {
    setPeerId(generateSqldsId());
  };

  // Create the context value object
  const contextValue: PeerContextType = {
    peerId,
    setPeerId,
    resetPeerId,
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

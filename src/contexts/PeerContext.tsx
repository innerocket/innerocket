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

// Provider component
export function PeerProvider({
  children,
}: {
  children: preact.ComponentChildren;
}) {
  // Initialize state from localStorage or generate a new sqlds ID
  const [peerId, setPeerId] = useState<string>(() => {
    const savedPeerId = localStorage.getItem(PEER_ID_STORAGE_KEY);
    return (
      savedPeerId ||
      sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])
    );
  });

  // Save to localStorage whenever peerId changes
  useEffect(() => {
    localStorage.setItem(PEER_ID_STORAGE_KEY, peerId);
  }, [peerId]);

  // Function to reset the peer ID
  const resetPeerId = () => {
    setPeerId(sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)]));
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

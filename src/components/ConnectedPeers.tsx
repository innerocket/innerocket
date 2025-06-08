import { useState } from 'preact/hooks';
import { FilePlus, X, QrCode } from 'lucide-react';
import { QRCodeHandler } from './QRCodeHandler';
import { tv } from 'tailwind-variants';

const buttonStyles = tv({
  base: 'p-2 rounded-lg',
  variants: {
    active: {
      true: 'text-green-500 dark:text-green-400',
      false:
        'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500',
    },
  },
});

interface ConnectedPeersProps {
  peers: string[];
  onDisconnect: (peerId: string) => void;
  onSendFile: (peerId: string) => void;
}

export function ConnectedPeers({
  peers,
  onDisconnect,
  onSendFile,
}: ConnectedPeersProps) {
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  const toggleQRCode = (peerId: string) => {
    setShowQRCode(showQRCode === peerId ? null : peerId);
  };

  if (peers.length === 0) {
    return (
      <div className="p-4 mb-4 text-sm text-gray-500 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-300">
        No peers connected. Use the form above to connect to a peer.
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-lg dark:border-gray-700">
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {peers.map((peerId) => (
          <li key={peerId}>
            <div className="py-3 px-4 flex justify-between items-center">
              <div className="flex-1 flex items-center truncate mr-2">
                <code className="text-sm w-full max-w-full truncate bg-gray-100 px-2 py-1 rounded dark:bg-gray-700 dark:text-gray-300">
                  {peerId}
                </code>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleQRCode(peerId)}
                  type="button"
                  className={buttonStyles({ active: showQRCode === peerId })}
                  aria-label="Show QR Code"
                >
                  <QrCode className="h-5 w-5" stroke="currentColor" />
                </button>
                <button
                  onClick={() => onSendFile(peerId)}
                  type="button"
                  className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-500 p-2 rounded-lg"
                  aria-label="Send file"
                >
                  <FilePlus className="h-5 w-5" stroke="currentColor" />
                </button>
                <button
                  onClick={() => onDisconnect(peerId)}
                  type="button"
                  className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 p-2 rounded-lg"
                  aria-label="Disconnect"
                >
                  <X className="h-5 w-5" stroke="currentColor" />
                </button>
              </div>
            </div>
            {showQRCode === peerId && (
              <div className="py-3 px-4">
                <QRCodeHandler
                  mode="generate"
                  initialValue={peerId}
                  readOnly={true}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

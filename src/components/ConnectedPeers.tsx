import { useState } from 'preact/hooks';
import { FilePlus, X, QrCode } from 'lucide-react';
import { QRCodeHandler } from './QRCodeHandler';

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
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Connected Peers
        </h2>
        <p className="text-gray-500 text-sm">
          No peers connected. Use the form above to connect to a peer.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Connected Peers</h2>
      <ul className="divide-y divide-gray-200">
        {peers.map((peerId) => (
          <li key={peerId}>
            <div className="py-3 flex justify-between items-center">
              <div className="flex-1 truncate">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {peerId}
                </code>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => toggleQRCode(peerId)}
                  className={`${
                    showQRCode === peerId
                      ? 'text-green-600'
                      : 'text-blue-600 hover:text-blue-800'
                  } p-2`}
                  aria-label="Show QR Code"
                >
                  <QrCode className="h-5 w-5" stroke="currentColor" />
                </button>
                <button
                  onClick={() => onSendFile(peerId)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  aria-label="Send file"
                >
                  <FilePlus className="h-5 w-5" stroke="currentColor" />
                </button>
                <button
                  onClick={() => onDisconnect(peerId)}
                  className="text-red-600 hover:text-red-800 p-2"
                  aria-label="Disconnect"
                >
                  <X className="h-5 w-5" stroke="currentColor" />
                </button>
              </div>
            </div>
            {showQRCode === peerId && (
              <div className="py-3">
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

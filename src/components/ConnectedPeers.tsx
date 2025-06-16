import { useState } from 'preact/hooks';
import { X, QrCode, Users } from 'lucide-react';
import { QRCodeModal } from './QRCodeModal';
import { IconButton, EmptyState } from './ui';
interface ConnectedPeersProps {
  peers: string[];
  onDisconnect: (peerId: string) => void;
}

export function ConnectedPeers({ peers, onDisconnect }: ConnectedPeersProps) {
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  const toggleQRCode = (peerId: string) => {
    setShowQRCode(showQRCode === peerId ? null : peerId);
  };

  if (peers.length === 0) {
    return (
      <EmptyState
        icon={<Users className="w-6 h-6 text-gray-500 dark:text-gray-400" />}
        title="No peers connected yet"
        subtitle="Connect to peers to start sharing files"
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {peers.map((peerId) => (
          <div
            key={peerId}
            className="bg-white border-2 border-gray-200 rounded-lg transition-all duration-200 dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="p-4 flex justify-between items-center">
              <div className="flex-1 flex items-center truncate mr-3">
                <div className="w-3 h-3 bg-green-500 rounded-lg mr-3 animate-pulse"></div>
                <code className="text-sm flex-1 truncate bg-gray-100 px-3 py-2 rounded-md dark:bg-gray-700 dark:text-gray-300 font-mono">
                  {peerId}
                </code>
              </div>
              <div className="flex space-x-1">
                <IconButton
                  onClick={() => toggleQRCode(peerId)}
                  variant="ghost"
                  size="sm"
                  icon={<QrCode />}
                  ariaLabel="Show QR Code"
                />
                <IconButton
                  onClick={() => onDisconnect(peerId)}
                  variant="ghost"
                  size="sm"
                  icon={<X />}
                  ariaLabel="Disconnect"
                  className="hover:text-red-600 dark:hover:text-red-400"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode !== null}
        onClose={() => setShowQRCode(null)}
        value={showQRCode || ''}
        title="Peer QR Code"
      />
    </>
  );
}

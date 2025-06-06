import { useState, useEffect } from 'preact/hooks';
import { QRCodeHandler } from './QRCodeHandler';
import { useFileTransfer } from '../hooks/useFileTransfer';
import { usePeer } from '../contexts/PeerContext';
import type { NotificationType } from './Notification';

interface QRCodePageProps {
  onSwitchToFileTransfer: () => void;
  showNotification: (message: string, type: NotificationType) => void;
  onSelectPeer: (peerId: string) => void;
}

export function QRCodePage({
  onSwitchToFileTransfer,
  showNotification,
  onSelectPeer,
}: QRCodePageProps) {
  const { connectToPeer, connectedPeers } = useFileTransfer();
  const { peerId } = usePeer();
  const [scannedValue, setScannedValue] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectedPeer, setConnectedPeer] = useState<string | null>(null);

  // Monitor connected peers to detect when our scanned peer connects
  useEffect(() => {
    if (scannedValue && connectedPeers.includes(scannedValue)) {
      setIsConnecting(false);
      setConnectedPeer(scannedValue);
      setConnectionStatus(`Connected to peer: ${scannedValue}`);

      // Show notification
      showNotification(
        `Successfully connected to peer ${scannedValue.substring(0, 8)}...`,
        'success'
      );
    }
  }, [connectedPeers, scannedValue, showNotification]);

  const handleScan = (data: string) => {
    setScannedValue(data);
    setConnectionStatus(`Ready to connect with ID: ${data}`);

    // Check if we're already connected to this peer
    if (connectedPeers.includes(data)) {
      setConnectedPeer(data);
      setConnectionStatus(`Already connected to peer: ${data}`);
    } else {
      setConnectedPeer(null);
    }
  };

  const handleConnect = () => {
    if (scannedValue && !connectedPeers.includes(scannedValue)) {
      setIsConnecting(true);
      setConnectionStatus(`Connecting to peer: ${scannedValue}...`);
      connectToPeer(scannedValue);

      // Show attempting to connect notification
      showNotification(
        `Attempting to connect to peer ${scannedValue.substring(0, 8)}...`,
        'info'
      );
    }
  };

  const handleSendFiles = () => {
    if (connectedPeer) {
      onSelectPeer(connectedPeer);
      showNotification(
        'Switched to File Transfer tab. You can now send files to the connected peer.',
        'info'
      );
      onSwitchToFileTransfer();
    }
  };

  return (
    <div className="qr-code-page max-w-4xl mx-auto py-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        QR Code Connection
      </h2>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Your QR Code</h3>
        <p className="mb-4 text-gray-600">
          Share this QR code with others to let them connect to you. It contains
          your unique peer ID.
        </p>
        <QRCodeHandler mode="generate" initialValue={peerId} readOnly={true} />
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Scan QR Code</h3>
        <p className="mb-4 text-gray-600">
          Scan someone else's QR code to connect with them.
        </p>
        <QRCodeHandler mode="scan" onScan={handleScan} />

        {scannedValue && (
          <div className="mt-6">
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h4 className="text-md font-medium text-gray-700">
                Scanned Peer ID:
              </h4>
              <p className="text-sm break-all mt-1">{scannedValue}</p>
            </div>

            {!connectedPeer ? (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !scannedValue}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isConnecting ? 'Connecting...' : 'Connect to This Peer'}
              </button>
            ) : (
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <button
                  onClick={onSwitchToFileTransfer}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Go to File Transfer
                </button>
                <button
                  onClick={handleSendFiles}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Send Files to This Peer
                </button>
              </div>
            )}

            {connectionStatus && (
              <p className="mt-2 text-sm text-gray-600">{connectionStatus}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

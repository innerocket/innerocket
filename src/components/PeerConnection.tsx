import { useState } from 'preact/hooks';
import { Copy, Check, QrCode, ScanLine } from 'lucide-react';
import { usePeer } from '../contexts/PeerContext';
import { QRCodeModal } from './QRCodeModal';
import { Button, IconButton } from './ui';

interface PeerConnectionProps {
  onConnect: (peerId: string) => void;
}

export function PeerConnection({ onConnect }: PeerConnectionProps) {
  const { peerId } = usePeer();
  const [peerIdInput, setPeerIdInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const handleConnect = () => {
    if (peerIdInput.trim() && peerIdInput !== peerId) {
      onConnect(peerIdInput.trim());
      setPeerIdInput('');
    }
  };

  const copyMyPeerId = () => {
    navigator.clipboard.writeText(peerId);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
    if (showQRScanner) setShowQRScanner(false);
  };

  const toggleQRScanner = () => {
    setShowQRScanner(!showQRScanner);
    if (showQRCode) setShowQRCode(false);
  };

  const handleScan = (data: string) => {
    if (data && data !== peerId) {
      setPeerIdInput(data);
      setShowQRScanner(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        {/* Your Peer ID Section */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              Your Peer ID
            </h4>
            <div className="flex space-x-2">
              <IconButton
                onClick={copyMyPeerId}
                variant={copySuccess ? 'success' : 'ghost'}
                size="sm"
                icon={copySuccess ? <Check /> : <Copy />}
                ariaLabel="Copy to clipboard"
              />
              <IconButton
                onClick={toggleQRCode}
                variant="ghost"
                size="sm"
                icon={<QrCode />}
                ariaLabel="Show QR Code"
              />
            </div>
          </div>

          <code className="block w-full px-4 py-2 text-sm text-gray-800 bg-gray-100 rounded-md dark:bg-gray-700 dark:text-gray-200 font-mono break-all">
            {peerId}
          </code>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            {copySuccess ? (
              <span className="text-green-600 font-medium dark:text-green-400 flex items-center">
                <Check className="w-4 h-4 mr-1" />
                ID copied to clipboard!
              </span>
            ) : (
              'Share this ID with others to let them connect to you'
            )}
          </p>
        </div>

        {/* Connect to Peer Section */}
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Connect to a Peer
          </h4>

          <div className="flex items-center">
            <div className="flex-1">
              <input
                type="text"
                value={peerIdInput}
                onChange={(e) =>
                  setPeerIdInput((e.target as HTMLInputElement).value)
                }
                placeholder="Enter peer ID to connect"
                className="bg-gray-50 outline-gray-200 text-gray-900 outline-2 -outline-offset-2 text-sm rounded-l-md focus:outline-blue-400 block w-full p-3 transition-all duration-200 dark:bg-gray-700 dark:outline-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:outline-blue-500"
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={!peerIdInput.trim() || peerIdInput === peerId}
              className="rounded-r-md rounded-l-none border-l-0 mr-2"
              size="md"
            >
              Connect
            </Button>
            <IconButton
              onClick={toggleQRScanner}
              variant={showQRScanner ? 'primary' : 'secondary'}
              size="md"
              icon={<ScanLine size={20} />}
              ariaLabel="Scan QR Code"
            />
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={showQRCode}
        onClose={() => setShowQRCode(false)}
        value={peerId}
        title="Your Peer ID"
        mode="generate"
      />

      {/* QR Scanner Modal */}
      <QRCodeModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        title="Scan QR Code"
        mode="scan"
        onScan={handleScan}
      />
    </>
  );
}

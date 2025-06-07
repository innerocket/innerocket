import { useState } from 'preact/hooks';
import { Copy, Check, QrCode, ScanLine } from 'lucide-react';
import { usePeer } from '../contexts/PeerContext';
import { QRCodeHandler } from './QRCodeHandler';
import { Card, Button, IconButton } from './ui';

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
    }
  };

  return (
    <Card title="Connect with Peers">
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-sm font-semibold text-gray-600">Your ID:</span>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm ml-2 flex-1 truncate">
            {peerId}
          </code>
          <IconButton
            onClick={copyMyPeerId}
            variant={copySuccess ? 'success' : 'ghost'}
            size="sm"
            icon={copySuccess ? <Check /> : <Copy />}
            ariaLabel="Copy to clipboard"
          />
          <IconButton
            onClick={toggleQRCode}
            variant={showQRCode ? 'info' : 'ghost'}
            size="sm"
            icon={<QrCode />}
            ariaLabel="Show QR Code"
          />
        </div>
        <p className="text-xs text-gray-500">
          {copySuccess ? (
            <span className="text-green-600 font-medium">
              ID copied to clipboard!
            </span>
          ) : (
            'Share this ID with others to let them connect to you'
          )}
        </p>

        {showQRCode && (
          <div className="mt-4">
            <QRCodeHandler
              mode="generate"
              initialValue={peerId}
              readOnly={true}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center">
          <div className="flex-1">
            <input
              type="text"
              value={peerIdInput}
              onChange={(e) =>
                setPeerIdInput((e.target as HTMLInputElement).value)
              }
              placeholder="Enter peer ID to connect"
              className="w-full border border-gray-300 rounded-l-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button
            onClick={handleConnect}
            disabled={!peerIdInput.trim() || peerIdInput === peerId}
            className="rounded-l-none"
          >
            Connect
          </Button>
          <IconButton
            onClick={toggleQRScanner}
            variant={showQRScanner ? 'info' : 'secondary'}
            icon={<ScanLine />}
            ariaLabel="Scan QR Code"
            className="ml-2"
          />
        </div>

        {showQRScanner && (
          <div className="mt-2">
            <QRCodeHandler mode="scan" onScan={handleScan} />
          </div>
        )}
      </div>
    </Card>
  );
}

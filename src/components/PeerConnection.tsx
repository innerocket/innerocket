import { useState } from 'preact/hooks';
import { Copy, Check, QrCode, ScanLine } from 'lucide-react';
import { usePeer } from '../contexts/PeerContext';
import { QRCodeHandler } from './QRCodeHandler';
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
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div className="p-4 bg-white border-b rounded-t-lg border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <h5 className="text-xl font-medium text-gray-900 dark:text-white">
          Connect with Peers
        </h5>
      </div>
      <div className="p-4">
        <div className="mb-4">
          <div className="flex items-center mb-2 space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Your ID:
            </span>
            <code className="flex-1 px-3 py-1 text-sm text-gray-800 bg-gray-100 rounded dark:bg-gray-700 dark:text-gray-300 truncate mr-2">
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {copySuccess ? (
              <span className="text-green-600 font-medium dark:text-green-400">
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
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-l-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              />
            </div>
            <Button
              onClick={handleConnect}
              disabled={!peerIdInput.trim() || peerIdInput === peerId}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-r-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 rounded-l-none"
            >
              Connect
            </Button>
            <button
              onClick={toggleQRScanner}
              type="button"
              className={`ml-2 p-2.5 text-sm font-medium ${
                showQRScanner
                  ? 'text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
                  : 'text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700'
              } rounded-lg`}
              aria-label="Scan QR Code"
            >
              <ScanLine size={20} />
            </button>
          </div>

          {showQRScanner && (
            <div className="mt-2">
              <QRCodeHandler mode="scan" onScan={handleScan} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

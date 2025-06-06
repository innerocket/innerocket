import { useState } from 'preact/hooks';
import { Copy, Check } from 'lucide-react';
import { usePeer } from '../contexts/PeerContext';

interface PeerConnectionProps {
  onConnect: (peerId: string) => void;
}

export function PeerConnection({ onConnect }: PeerConnectionProps) {
  const { peerId } = usePeer();
  const [peerIdInput, setPeerIdInput] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

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

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Connect with Peers
      </h2>

      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="text-sm font-semibold text-gray-600">Your ID:</span>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm ml-2 flex-1 truncate">
            {peerId}
          </code>
          <button
            onClick={copyMyPeerId}
            className={`ml-2 p-2 ${
              copySuccess
                ? 'text-green-600'
                : 'text-blue-600 hover:text-blue-800'
            }`}
            aria-label="Copy to clipboard"
          >
            {copySuccess ? (
              <Check className="h-5 w-5" stroke="currentColor" />
            ) : (
              <Copy className="h-5 w-5" stroke="currentColor" />
            )}
          </button>
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
      </div>

      <div className="flex items-center">
        <input
          type="text"
          value={peerIdInput}
          onChange={(e) => setPeerIdInput((e.target as HTMLInputElement).value)}
          placeholder="Enter peer ID to connect"
          className="flex-1 border rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleConnect}
          disabled={!peerIdInput.trim() || peerIdInput === peerId}
          className="bg-blue-600 text-white px-4 py-2 rounded-r hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

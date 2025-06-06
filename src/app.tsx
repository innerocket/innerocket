import { useState, useRef, useEffect } from 'preact/hooks';
import { useFileTransfer } from './hooks/useFileTransfer';
import { PeerConnection } from './components/PeerConnection';
import { ConnectedPeers } from './components/ConnectedPeers';
import { FileTransferList } from './components/FileTransferList';
import { FileRequests } from './components/FileRequests';
import { FileSender } from './components/FileSender';
import { QRCodePage } from './components/QRCodePage';
import { NotificationContainer } from './components/Notification';
import type {
  NotificationItem,
  NotificationType,
} from './components/Notification';
import { v4 as uuidv4 } from 'uuid';
import { Info, QrCode } from 'lucide-react';
import { usePeer } from './contexts/PeerContext';

export function App() {
  const { peerId } = usePeer();
  const {
    connectedPeers,
    fileTransfers,
    incomingRequests,
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    acceptFileTransfer,
    rejectFileTransfer,
    downloadFile,
  } = useFileTransfer();

  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'qrcode'>('files');
  const prevFileTransfers = useRef(fileTransfers);

  // Monitor file transfers for status changes
  useEffect(() => {
    // Check for newly completed transfers
    fileTransfers.forEach((transfer) => {
      const prevTransfer = prevFileTransfers.current.find(
        (t) => t.id === transfer.id
      );

      // If a transfer just completed, show a notification
      if (
        transfer.status === 'completed' &&
        prevTransfer &&
        prevTransfer.status !== 'completed'
      ) {
        showNotification(
          `File "${transfer.fileName}" has been ${
            transfer.sender === peerId ? 'sent' : 'received'
          } successfully!`,
          'success'
        );
      }

      // If a transfer failed, show a notification
      if (
        transfer.status === 'failed' &&
        prevTransfer &&
        prevTransfer.status !== 'failed'
      ) {
        showNotification(
          `Failed to ${transfer.sender === peerId ? 'send' : 'receive'} file "${
            transfer.fileName
          }"`,
          'error'
        );
      }
    });

    prevFileTransfers.current = fileTransfers;
  }, [fileTransfers, peerId]);

  const showNotification = (message: string, type: NotificationType) => {
    const id = uuidv4();
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const handleSendFile = (file: File) => {
    if (selectedPeerId) {
      const transferId = sendFile(selectedPeerId, file);
      if (transferId) {
        showNotification(`Sending file "${file.name}"...`, 'info');
      } else {
        showNotification(
          `Failed to initiate file transfer for "${file.name}"`,
          'error'
        );
      }
    }
  };

  const handleConnectToPeer = (peerId: string) => {
    connectToPeer(peerId);
    showNotification(`Connecting to peer ${peerId}...`, 'info');
  };

  const handleDisconnectFromPeer = (peerId: string) => {
    disconnectFromPeer(peerId);
    setSelectedPeerId((prev) => (prev === peerId ? null : prev));
    showNotification(`Disconnected from peer ${peerId}`, 'info');
  };

  const handleSelectPeerForSending = (peerId: string) => {
    setSelectedPeerId(peerId);
    showNotification(`Selected peer ${peerId} for file transfer`, 'info');
  };

  const handleAcceptFileTransfer = (request: any) => {
    acceptFileTransfer(request);
    showNotification(
      `Accepted file transfer for "${request.metadata.name}"`,
      'info'
    );
  };

  const handleRejectFileTransfer = (request: any) => {
    rejectFileTransfer(request);
    showNotification(
      `Rejected file transfer for "${request.metadata.name}"`,
      'info'
    );
  };

  const handleDownloadFile = (fileId: string) => {
    downloadFile(fileId);
    const transfer = fileTransfers.find((t) => t.id === fileId);
    if (transfer) {
      showNotification(`Downloading file "${transfer.fileName}"...`, 'info');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('files')}
              className={`${
                activeTab === 'files'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <span className="mr-2">File Transfer</span>
            </button>
            <button
              onClick={() => setActiveTab('qrcode')}
              className={`${
                activeTab === 'qrcode'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <QrCode className="mr-2 h-4 w-4" />
              <span>QR Code Connection</span>
            </button>
          </nav>
        </div>

        {/* File Transfer Tab */}
        {activeTab === 'files' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <PeerConnection onConnect={handleConnectToPeer} />

                <ConnectedPeers
                  peers={connectedPeers}
                  onDisconnect={handleDisconnectFromPeer}
                  onSendFile={handleSelectPeerForSending}
                />
              </div>

              <div>
                <FileRequests
                  requests={incomingRequests}
                  onAccept={handleAcceptFileTransfer}
                  onReject={handleRejectFileTransfer}
                />

                <FileTransferList
                  transfers={fileTransfers}
                  onDownload={handleDownloadFile}
                />
              </div>
            </div>

            <div className="mt-12 bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">About</h2>
              <p className="mb-3 text-gray-600">
                Innerocket is a secure peer-to-peer file sharing application
                that uses WebRTC technology to transfer files directly between
                users without sending any file data through servers.
              </p>
              <p className="mb-3 text-gray-600">
                All file transfers are end-to-end encrypted and take place
                directly between your browser and the recipient's browser. This
                means your files never touch our servers, ensuring maximum
                privacy and security.
              </p>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      To share files, first connect with the recipient by
                      exchanging peer IDs, then select the file and send it
                      directly to them.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* QR Code Tab */}
        {activeTab === 'qrcode' && (
          <QRCodePage
            showNotification={showNotification}
            onSwitchToFileTransfer={() => setActiveTab('files')}
            onSelectPeer={handleSelectPeerForSending}
          />
        )}
      </main>

      <FileSender currentPeerId={selectedPeerId} onSendFile={handleSendFile} />

      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />
    </div>
  );
}

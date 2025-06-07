import { useState, useRef, useEffect } from 'preact/hooks';
import { useFileTransfer } from './hooks/useFileTransfer';
import { PeerConnection } from './components/PeerConnection';
import { ConnectedPeers } from './components/ConnectedPeers';
import { FileTransferList } from './components/FileTransferList';
import { FileRequests } from './components/FileRequests';
import { FileSender } from './components/FileSender';
import { FilePreview } from './components/FilePreview';
import { NotificationContainer } from './components/Notification';
import type {
  NotificationItem,
  NotificationType,
} from './components/Notification';
import { v4 as uuidv4 } from 'uuid';
import { Info, HelpCircle } from 'lucide-react';
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
    previewFile,
    getFileType,
  } = useFileTransfer();

  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const prevFileTransfers = useRef(fileTransfers);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);

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

      // If an integrity check failed, show a notification
      if (
        transfer.status === 'integrity_error' &&
        prevTransfer &&
        prevTransfer.status !== 'integrity_error'
      ) {
        showNotification(
          `Integrity check failed for "${transfer.fileName}". The file may be corrupted.`,
          'error'
        );
      }
    });

    prevFileTransfers.current = fileTransfers;
  }, [fileTransfers, peerId]);

  // Clean up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  // Clean up previous preview URL when a new one is set
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

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

  const handlePreviewFile = async (fileId: string) => {
    const transfer = fileTransfers.find((t) => t.id === fileId);
    if (!transfer) return;

    // Set the file ID first to show the loading state
    setPreviewFileId(fileId);

    // Fetch the preview URL
    const url = await previewFile(fileId);

    if (url) {
      setPreviewUrl(url);
    } else {
      showNotification(`Unable to preview "${transfer.fileName}"`, 'error');
      setPreviewFileId(null);
    }
  };

  const handleClosePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewFileId(null);
  };

  const toggleHelp = () => {
    setShowHelp(!showHelp);
  };

  const handleCloseFileSender = () => {
    setSelectedPeerId(null);
    showNotification('File sender closed', 'info');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <main className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel - Connection Info */}
          <div className="w-full bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg dark:bg-gray-800 dark:border-gray-700">
              <h5 className="text-xl font-medium text-gray-900 dark:text-white">
                Your Connection
              </h5>
            </div>

            <div className="p-4">
              <div className="mb-6">
                <PeerConnection onConnect={handleConnectToPeer} />
              </div>

              <div>
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                  Connected Peers
                </h3>
                <ConnectedPeers
                  peers={connectedPeers}
                  onDisconnect={handleDisconnectFromPeer}
                  onSendFile={handleSelectPeerForSending}
                />
              </div>
            </div>
          </div>

          {/* Right Panel - File Transfers */}
          <div className="w-full bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg dark:bg-gray-800 dark:border-gray-700">
              <h5 className="text-xl font-medium text-gray-900 dark:text-white">
                File Transfer History
              </h5>
            </div>

            <div className="p-4">
              <FileRequests
                requests={incomingRequests}
                onAccept={handleAcceptFileTransfer}
                onReject={handleRejectFileTransfer}
              />

              <div>
                <FileTransferList
                  transfers={fileTransfers}
                  onDownload={handleDownloadFile}
                  onPreview={handlePreviewFile}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Help Toggle Button */}
        <div className="mt-4 flex justify-center">
          <button
            onClick={toggleHelp}
            type="button"
            className="inline-flex items-center text-blue-700 hover:text-white border border-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:border-blue-500 dark:text-blue-500 dark:hover:text-white dark:hover:bg-blue-600 dark:focus:ring-blue-800"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            <span>
              {showHelp ? 'Hide information' : 'Click for more information'}
            </span>
          </button>
        </div>

        {/* Help Section - Togglable */}
        {showHelp && (
          <div className="mt-4 w-full bg-white border border-gray-200 rounded-lg dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 bg-white border-b border-gray-200 rounded-t-lg dark:bg-gray-800 dark:border-gray-700">
              <h5 className="text-xl font-medium text-gray-900 dark:text-white">
                About
              </h5>
            </div>

            <div className="p-4">
              <p className="mb-3 text-gray-500 dark:text-gray-400">
                Innerocket is a secure peer-to-peer file sharing application
                that uses WebRTC technology to transfer files directly between
                users without sending any file data through servers.
              </p>
              <p className="mb-3 text-gray-500 dark:text-gray-400">
                All file transfers are end-to-end encrypted and take place
                directly between your browser and the recipient's browser. This
                means your files never touch our servers, ensuring maximum
                privacy and security.
              </p>
              <div className="p-4 mb-4 text-sm text-blue-800 border border-blue-300 rounded-lg bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:border-blue-800">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <p>
                      To share files, first connect with the recipient by
                      exchanging peer IDs or scanning their QR code, then select
                      the file and send it directly to them.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <FileSender
        currentPeerId={selectedPeerId}
        onSendFile={handleSendFile}
        onClose={handleCloseFileSender}
      />

      <NotificationContainer
        notifications={notifications}
        onRemove={removeNotification}
      />

      {previewFileId && (
        <FilePreview
          fileName={
            fileTransfers.find((t) => t.id === previewFileId)?.fileName ||
            'Unknown file'
          }
          fileType={getFileType(previewFileId) || 'application/octet-stream'}
          previewUrl={previewUrl}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}

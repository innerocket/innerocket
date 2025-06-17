import { useState, useRef, useEffect } from 'preact/hooks';
import { useFileTransfer } from './hooks/useFileTransfer';
import { PeerConnection } from './components/PeerConnection';
import { ConnectedPeers } from './components/ConnectedPeers';
import { FileSender } from './components/FileSender';
import { FilePreview } from './components/FilePreview';
import { NotificationContainer } from './components/Notification';
import { IncomingRequests } from './components/IncomingRequests';
import { HistoryTab } from './components/HistoryTab';
import { TabsProvider, TabList, TabButton, TabContent } from './components/ui';
import type {
  NotificationItem,
  NotificationType,
} from './components/Notification';
import Sqlds from 'sqids';
import { Info, HelpCircle, Trash2 } from 'lucide-react';
import { usePeer } from './contexts/PeerContext';

const sqlds = new Sqlds();

export function App() {
  const { peerId } = usePeer();
  const {
    connectedPeers,
    fileTransfers,
    connectToPeer,
    disconnectFromPeer,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    downloadFile,
    previewFile,
    getFileType,
    clearFileHistory,
  } = useFileTransfer();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const prevFileTransfers = useRef(fileTransfers);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [showClearConfirmation, setShowClearConfirmation] =
    useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('connection');

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

      // If a transfer enters verification phase
      if (
        transfer.status === 'verifying' &&
        prevTransfer &&
        prevTransfer.status !== 'verifying'
      ) {
        showNotification(
          `Verifying integrity of "${transfer.fileName}"...`,
          'info'
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
    const id = sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)]);
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const handleSendFileToAll = async (file: File) => {
    const transferIds = await sendFileToAllPeers(file);
    if (transferIds.length > 0) {
      showNotification(
        `Sending file "${file.name}" to ${transferIds.length} peers...`,
        'info'
      );
    } else {
      showNotification(
        `Failed to initiate file transfer for "${file.name}"`,
        'error'
      );
    }
  };

  const handleConnectToPeer = (peerId: string) => {
    connectToPeer(peerId);
    showNotification(`Connecting to peer ${peerId}...`, 'info');
  };

  const handleDisconnectFromPeer = (peerId: string) => {
    disconnectFromPeer(peerId);
    showNotification(`Disconnected from peer ${peerId}`, 'info');
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

    try {
      // Fetch the preview URL
      const url = await previewFile(fileId);

      if (url) {
        setPreviewUrl(url);
      } else {
        showNotification(`Unable to preview "${transfer.fileName}"`, 'error');
        setPreviewFileId(null);
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      showNotification(`Error previewing "${transfer.fileName}"`, 'error');
      setPreviewFileId(null);
    }
  };

  const handleAcceptRequest = (id: string) => {
    const req = incomingRequests.find((r) => r.metadata.id === id);
    if (req) {
      acceptRequest(id);
      showNotification(`Accepted file "${req.metadata.name}"`, 'info');
    }
  };

  const handleRejectRequest = (id: string) => {
    const req = incomingRequests.find((r) => r.metadata.id === id);
    if (req) {
      rejectRequest(id);
      showNotification(`Rejected file "${req.metadata.name}"`, 'warning');
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

  const handleClearFileHistory = () => {
    setShowClearConfirmation(true);
  };

  const confirmClearFileHistory = () => {
    clearFileHistory();
    showNotification('File transfer history has been cleared', 'info');
    setShowClearConfirmation(false);
  };

  const cancelClearFileHistory = () => {
    setShowClearConfirmation(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="max-w-4xl mx-auto py-4 px-2 sm:py-8 sm:px-6 lg:px-8">
        {/* Main Tabbed Interface */}
        <div className="w-full bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
          <TabsProvider activeTab={activeTab} onTabChange={setActiveTab}>
            {/* Tab Navigation */}
            <TabList className="px-6 pt-6">
              <TabButton value="connection">Connection</TabButton>
              <TabButton value="file-transfer">File Transfer</TabButton>
              <TabButton value="history">History</TabButton>
            </TabList>

            {/* Tab Content */}
            <div className="p-6">
              {/* Connection Tab */}
              <TabContent value="connection">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Connection
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      Connect with peers to start sharing files
                    </p>
                    <PeerConnection onConnect={handleConnectToPeer} />
                  </div>

                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                      Connected Peers
                    </h3>
                    <ConnectedPeers
                      peers={connectedPeers}
                      onDisconnect={handleDisconnectFromPeer}
                    />
                  </div>
                </div>
              </TabContent>

              {/* File Transfer Tab */}
              <TabContent value="file-transfer">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Send Files
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Upload and share files with connected peers
                  </p>
                  <FileSender
                    onSendFileToAll={handleSendFileToAll}
                    connectedPeersCount={connectedPeers.length}
                  />
                </div>
              </TabContent>

              {/* History Tab */}
              <TabContent value="history">
                <HistoryTab
                  transfers={fileTransfers}
                  onDownload={handleDownloadFile}
                  onPreview={handlePreviewFile}
                  onClearHistory={handleClearFileHistory}
                />
              </TabContent>
            </div>
          </TabsProvider>
        </div>

        {/* Help Toggle Button */}
        <div className="mt-8 mb-4 flex justify-center">
          <button
            onClick={toggleHelp}
            type="button"
            className="inline-flex items-center text-blue-600 hover:text-white border-2 border-blue-500 hover:bg-blue-600 focus:ring-2 focus:outline-none focus:ring-blue-500 focus:ring-offset-2 font-medium rounded-lg text-sm px-6 py-3 transition-all duration-200 dark:border-blue-500 dark:text-blue-400 dark:hover:text-white dark:hover:bg-blue-600 dark:focus:ring-blue-500"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            <span>
              {showHelp ? 'Hide information' : 'Click for more information'}
            </span>
          </button>
        </div>

        {/* Help Section - Togglable */}
        {showHelp && (
          <div className="mt-8 mb-4 w-full bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="p-4 sm:p-6 border-b-2 border-gray-200 rounded-t-xl dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                About
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Learn how our secure file sharing works
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  Innerocket is a secure peer-to-peer file sharing application
                  that uses WebRTC technology to transfer files directly between
                  users without sending any file data through servers.
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  All file transfers are end-to-end encrypted and take place
                  directly between your browser and the recipient's browser.
                  This means your files never touch our servers, ensuring
                  maximum privacy and security.
                </p>
                <div className="p-4 text-sm text-blue-800 border-2 border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="leading-relaxed">
                        To share files, first connect with the recipient by
                        exchanging peer IDs or scanning their QR code, then
                        select the file and send it directly to them.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <IncomingRequests
        requests={incomingRequests}
        onAccept={handleAcceptRequest}
        onReject={handleRejectRequest}
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

      {/* Confirmation Dialog */}
      {showClearConfirmation && (
        <div className="fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex justify-center items-center z-50 dark:bg-gray-900/80">
          <div className="relative p-4 w-full max-w-md max-h-full">
            <div className="relative bg-white rounded-xl border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
              <div className="p-6 md:p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-lg flex items-center justify-center dark:bg-red-900/20">
                  <Trash2 className="text-red-600 w-8 h-8 dark:text-red-400" />
                </div>
                <h3 className="mb-6 text-lg font-semibold text-gray-900 dark:text-white">
                  Clear File Transfer History?
                </h3>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                  Are you sure you want to clear all file transfer history?
                  <br />
                  <span className="text-red-600 font-medium dark:text-red-400">
                    This action cannot be undone.
                  </span>
                </p>
                <div className="flex space-x-3 justify-center">
                  <button
                    onClick={confirmClearFileHistory}
                    type="button"
                    className="text-white bg-red-600 hover:bg-red-700 focus:ring-2 focus:outline-none focus:ring-red-500 focus:ring-offset-2 font-medium rounded-md text-sm inline-flex items-center px-5 py-2.5 transition-all duration-200 dark:focus:ring-red-500"
                  >
                    Yes, clear history
                  </button>
                  <button
                    onClick={cancelClearFileHistory}
                    type="button"
                    className="text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:outline-none focus:ring-gray-500 focus:ring-offset-2 rounded-md border-2 border-gray-300 text-sm font-medium px-5 py-2.5 hover:border-gray-400 transition-all duration-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

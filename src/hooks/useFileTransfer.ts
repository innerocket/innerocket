import { useMemo, useState } from 'preact/hooks';
import { useFileTransferState } from './useFileTransferState';
import { useFileOperations } from './useFileOperations';
import { useWebRTCFileTransfer } from './useWebRTCFileTransfer';
import { FileStorageService } from '../services/fileStorageService';

export function useFileTransfer() {
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const {
    fileTransfers,
    receivedFiles,
    addTransfer,
    updateTransfer,
    updateTransferProgress,
    removeTransfer,
    clearAllTransfers,
    addReceivedFile,
    getReceivedFile,
  } = useFileTransferState();

  const {
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    myPeerId,
  } = useWebRTCFileTransfer({
    addTransfer,
    updateTransfer,
    updateTransferProgress,
    addReceivedFile,
    removeTransfer,
    setConnectedPeers,
  });

  const { downloadFile, previewFile, getFileType } = useFileOperations({
    fileTransfers,
    getReceivedFile,
  });

  const fileStorageService = useMemo(() => new FileStorageService(), []);

  const clearFileHistory = async () => {
    await fileStorageService.clearAllFiles();
    clearAllTransfers();
  };

  return {
    myPeerId,
    connectedPeers,
    fileTransfers,
    receivedFiles,
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    downloadFile,
    previewFile,
    getFileType,
    clearFileHistory,
  };
}

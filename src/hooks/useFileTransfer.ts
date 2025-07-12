import { createSignal } from 'solid-js'
import { useFileTransferState } from './useFileTransferState'
import { useFileOperations } from './useFileOperations'
import { useWebRTCFileTransfer } from './useWebRTCFileTransfer'
import { FileStorageService } from '../services/fileStorageService'

export function useFileTransfer() {
  const [isTransferring, setIsTransferring] = createSignal(false)
  const [connectedPeers, setConnectedPeers] = createSignal<string[]>([])
  const [compressionEnabled, setCompressionEnabled] = createSignal(true)

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
  } = useFileTransferState()

  const {
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    myPeerId,
    setWebRTCCompressionEnabled,
    getCompressionStats,
  } = useWebRTCFileTransfer({
    addTransfer,
    updateTransfer,
    updateTransferProgress,
    addReceivedFile,
    removeTransfer,
    setConnectedPeers,
    setIsTransferring,
  })

  const { downloadFile, previewFile, getFileType } = useFileOperations({
    fileTransfers,
    getReceivedFile,
  })

  const fileStorageService = new FileStorageService()

  const clearFileHistory = async () => {
    await fileStorageService.clearAllFiles()
    clearAllTransfers()
  }

  const handleCompressionToggle = (enabled: boolean) => {
    console.log(`[UI] Compression toggle changed to: ${enabled}`)
    setCompressionEnabled(enabled)
    setWebRTCCompressionEnabled(enabled)
  }

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
    isTransferring,
    compressionEnabled,
    setCompressionEnabled: handleCompressionToggle,
    getCompressionStats,
  }
}

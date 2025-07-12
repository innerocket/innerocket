import { createSignal, createEffect } from 'solid-js'
import { useFileTransferState } from './useFileTransferState'
import { useFileOperations } from './useFileOperations'
import { useWebRTCFileTransfer } from './useWebRTCFileTransfer'
import { FileStorageService } from '../services/fileStorageService'

const COMPRESSION_STORAGE_KEY = 'innerocket-compression-enabled'

// Load compression setting from localStorage
function loadCompressionSetting(): boolean {
  try {
    const saved = localStorage.getItem(COMPRESSION_STORAGE_KEY)
    if (saved !== null) {
      const enabled = JSON.parse(saved)
      console.log(`[STORAGE] Loaded compression setting: ${enabled}`)
      return enabled
    }
  } catch (error) {
    console.warn('[STORAGE] Failed to load compression setting:', error)
  }
  
  // Default to enabled if no setting found
  console.log('[STORAGE] Using default compression setting: true')
  return true
}

// Save compression setting to localStorage
function saveCompressionSetting(enabled: boolean): void {
  try {
    localStorage.setItem(COMPRESSION_STORAGE_KEY, JSON.stringify(enabled))
    console.log(`[STORAGE] Saved compression setting: ${enabled}`)
  } catch (error) {
    console.warn('[STORAGE] Failed to save compression setting:', error)
  }
}

export function useFileTransfer() {
  const [isTransferring, setIsTransferring] = createSignal(false)
  const [connectedPeers, setConnectedPeers] = createSignal<string[]>([])
  const [compressionEnabled, setCompressionEnabled] = createSignal(loadCompressionSetting())

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

  // Initialize WebRTC compression setting with loaded value
  createEffect(() => {
    const enabled = compressionEnabled()
    console.log(`[INIT] Setting initial compression state: ${enabled}`)
    setWebRTCCompressionEnabled(enabled)
  })

  // Save to localStorage whenever compression setting changes
  createEffect(() => {
    const enabled = compressionEnabled()
    saveCompressionSetting(enabled)
  })

  const handleCompressionToggle = (enabled: boolean) => {
    console.log(`[UI] Compression toggle changed to: ${enabled}`)
    setCompressionEnabled(enabled)
    // The createEffect above will handle saving to localStorage and WebRTC setting
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

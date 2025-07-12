import { createSignal, createEffect } from 'solid-js'
import { useFileTransferState } from './useFileTransferState'
import { useFileOperations } from './useFileOperations'
import { useWebRTCFileTransfer } from './useWebRTCFileTransfer'
import { FileStorageService } from '../services/fileStorageService'
import { debugLog, debugWarn } from '../utils/debug'

const COMPRESSION_STORAGE_KEY = 'innerocket_compression_enabled'
const AUTO_ACCEPT_STORAGE_KEY = 'innerocket_auto_accept_files'
const TRUSTED_PEERS_STORAGE_KEY = 'innerocket_trusted_peers'

// Load compression setting from localStorage
function loadCompressionSetting(): boolean {
  try {
    const saved = localStorage.getItem(COMPRESSION_STORAGE_KEY)
    if (saved !== null) {
      const enabled = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded compression setting: ${enabled}`)
      return enabled
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load compression setting:', error)
  }

  // Default to enabled if no setting found
  debugLog('[STORAGE] Using default compression setting: true')
  return true
}

// Save compression setting to localStorage
function saveCompressionSetting(enabled: boolean): void {
  try {
    localStorage.setItem(COMPRESSION_STORAGE_KEY, JSON.stringify(enabled))
    debugLog(`[STORAGE] Saved compression setting: ${enabled}`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save compression setting:', error)
  }
}

// Load auto-accept setting from localStorage
function loadAutoAcceptSetting(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_ACCEPT_STORAGE_KEY)
    if (saved !== null) {
      const enabled = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded auto-accept setting: ${enabled}`)
      return enabled
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load auto-accept setting:', error)
  }

  // Default to manual approval for security
  debugLog('[STORAGE] Using default auto-accept setting: false')
  return false
}

// Save auto-accept setting to localStorage
function saveAutoAcceptSetting(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_ACCEPT_STORAGE_KEY, JSON.stringify(enabled))
    debugLog(`[STORAGE] Saved auto-accept setting: ${enabled}`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save auto-accept setting:', error)
  }
}

// Load trusted peers from localStorage
function loadTrustedPeers(): string[] {
  try {
    const saved = localStorage.getItem(TRUSTED_PEERS_STORAGE_KEY)
    if (saved !== null) {
      const peers = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded trusted peers: ${peers.length} peers`)
      return Array.isArray(peers) ? peers : []
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load trusted peers:', error)
  }

  debugLog('[STORAGE] No trusted peers found, starting with empty list')
  return []
}

// Save trusted peers to localStorage
function saveTrustedPeers(peers: string[]): void {
  try {
    localStorage.setItem(TRUSTED_PEERS_STORAGE_KEY, JSON.stringify(peers))
    debugLog(`[STORAGE] Saved trusted peers: ${peers.length} peers`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save trusted peers:', error)
  }
}

export function useFileTransfer() {
  const [isTransferring, setIsTransferring] = createSignal(false)
  const [connectedPeers, setConnectedPeers] = createSignal<string[]>([])
  const [compressionEnabled, setCompressionEnabled] = createSignal(loadCompressionSetting())
  const [autoAcceptFiles, setAutoAcceptFiles] = createSignal(loadAutoAcceptSetting())
  const [trustedPeers, setTrustedPeers] = createSignal<string[]>(loadTrustedPeers())

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
    autoAcceptFiles,
    isTrustedPeer: () => isTrustedPeer,
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
    debugLog(`[INIT] Setting initial compression state: ${enabled}`)
    setWebRTCCompressionEnabled(enabled)
  })

  // Save to localStorage whenever compression setting changes
  createEffect(() => {
    const enabled = compressionEnabled()
    saveCompressionSetting(enabled)
  })

  // Save to localStorage whenever auto-accept setting changes
  createEffect(() => {
    const enabled = autoAcceptFiles()
    saveAutoAcceptSetting(enabled)
  })

  // Save to localStorage whenever trusted peers changes
  createEffect(() => {
    const peers = trustedPeers()
    saveTrustedPeers(peers)
  })

  const handleCompressionToggle = (enabled: boolean) => {
    debugLog(`[UI] Compression toggle changed to: ${enabled}`)
    setCompressionEnabled(enabled)
    // The createEffect above will handle saving to localStorage and WebRTC setting
  }

  const handleAutoAcceptToggle = (enabled: boolean) => {
    debugLog(`[UI] Auto-accept toggle changed to: ${enabled}`)
    setAutoAcceptFiles(enabled)
  }

  const addTrustedPeer = (peerId: string) => {
    if (!peerId.trim()) return false
    
    const normalizedPeerId = peerId.trim()
    const current = trustedPeers()
    
    if (current.includes(normalizedPeerId)) {
      debugLog(`[TRUSTED_PEERS] Peer ${normalizedPeerId} already in trusted list`)
      return false
    }
    
    setTrustedPeers([...current, normalizedPeerId])
    debugLog(`[TRUSTED_PEERS] Added peer ${normalizedPeerId} to trusted list`)
    return true
  }

  const removeTrustedPeer = (peerId: string) => {
    const current = trustedPeers()
    const filtered = current.filter(id => id !== peerId)
    
    if (filtered.length !== current.length) {
      setTrustedPeers(filtered)
      debugLog(`[TRUSTED_PEERS] Removed peer ${peerId} from trusted list`)
      return true
    }
    
    return false
  }

  const isTrustedPeer = (peerId: string): boolean => {
    return trustedPeers().includes(peerId)
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
    autoAcceptFiles,
    setAutoAcceptFiles: handleAutoAcceptToggle,
    trustedPeers,
    addTrustedPeer,
    removeTrustedPeer,
    isTrustedPeer,
  }
}

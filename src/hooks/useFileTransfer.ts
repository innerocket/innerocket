import { createSignal, createEffect } from 'solid-js'
import { useFileTransferState } from './useFileTransferState'
import { useFileOperations } from './useFileOperations'
import { useWebRTCFileTransfer } from './useWebRTCFileTransfer'
import { FileStorageService } from '../services/fileStorageService'
import { debugLog, debugWarn } from '../utils/debug'

const COMPRESSION_STORAGE_KEY = 'innerocket_compression_enabled'
const AUTO_ACCEPT_STORAGE_KEY = 'innerocket_auto_accept_files'
const TRUSTED_PEERS_STORAGE_KEY = 'innerocket_trusted_peers'
const MAX_FILE_SIZE_STORAGE_KEY = 'innerocket_max_file_size'
const COMPRESSION_LEVEL_STORAGE_KEY = 'innerocket_compression_level'
const CONNECTION_HISTORY_STORAGE_KEY = 'innerocket_connection_history'
const CONNECTION_METHOD_STORAGE_KEY = 'innerocket_connection_method'
const PRIVACY_MODE_STORAGE_KEY = 'innerocket_privacy_mode'

// Connection method options
export const CONNECTION_METHODS = {
  'auto': {
    label: 'Automatic',
    description: 'Automatically choose the best connection method',
    priority: ['direct', 'relay', 'turn']
  },
  'direct': {
    label: 'Direct P2P',
    description: 'Direct peer-to-peer connection (fastest, may not work behind NAT)',
    priority: ['direct']
  },
  'relay': {
    label: 'Relay Server',
    description: 'Use relay servers when direct connection fails',
    priority: ['direct', 'relay']
  },
  'turn': {
    label: 'TURN Server',
    description: 'Use TURN servers for connections behind strict firewalls',
    priority: ['direct', 'turn']
  },
  'fallback': {
    label: 'Adaptive Fallback',
    description: 'Try direct first, then fallback to relay/TURN as needed',
    priority: ['direct', 'relay', 'turn']
  }
} as const

export type ConnectionMethod = keyof typeof CONNECTION_METHODS
const DEFAULT_CONNECTION_METHOD: ConnectionMethod = 'auto'

// Connection history entry interface
export interface ConnectionHistoryEntry {
  peerId: string
  connectedAt: number
  disconnectedAt?: number
  duration?: number // in milliseconds
  filesTransferred: number
  totalBytesTransferred: number
  lastSeen: number
  connectionCount: number
}

// Max number of connection history entries to keep
const MAX_HISTORY_ENTRIES = 100

// Default max file size: 100MB
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024

// Preset file size options (in bytes)
export const FILE_SIZE_PRESETS = {
  '10MB': 10 * 1024 * 1024,
  '50MB': 50 * 1024 * 1024,
  '100MB': 100 * 1024 * 1024,
  '500MB': 500 * 1024 * 1024,
  '1GB': 1 * 1024 * 1024 * 1024,
  '5GB': 5 * 1024 * 1024 * 1024,
  'unlimited': 0 // 0 means no limit
} as const

export type FileSizePreset = keyof typeof FILE_SIZE_PRESETS

// Compression level presets
export const COMPRESSION_LEVELS = {
  'fast': {
    level: 1,
    label: 'Fast',
    description: 'Fastest compression, larger file size'
  },
  'balanced': {
    level: 6,
    label: 'Balanced',
    description: 'Good balance of speed and compression'
  },
  'best': {
    level: 9,
    label: 'Best',
    description: 'Best compression, slower processing'
  }
} as const

export type CompressionLevelPreset = keyof typeof COMPRESSION_LEVELS
const DEFAULT_COMPRESSION_LEVEL: CompressionLevelPreset = 'balanced'

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

// Load max file size from localStorage
function loadMaxFileSize(): number {
  try {
    const saved = localStorage.getItem(MAX_FILE_SIZE_STORAGE_KEY)
    if (saved !== null) {
      const size = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded max file size: ${size} bytes`)
      return typeof size === 'number' ? size : DEFAULT_MAX_FILE_SIZE
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load max file size:', error)
  }

  debugLog(`[STORAGE] Using default max file size: ${DEFAULT_MAX_FILE_SIZE} bytes`)
  return DEFAULT_MAX_FILE_SIZE
}

// Save max file size to localStorage
function saveMaxFileSize(size: number): void {
  try {
    localStorage.setItem(MAX_FILE_SIZE_STORAGE_KEY, JSON.stringify(size))
    debugLog(`[STORAGE] Saved max file size: ${size} bytes`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save max file size:', error)
  }
}

// Load compression level from localStorage
function loadCompressionLevel(): CompressionLevelPreset {
  try {
    const saved = localStorage.getItem(COMPRESSION_LEVEL_STORAGE_KEY)
    if (saved !== null) {
      const level = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded compression level: ${level}`)
      return level && level in COMPRESSION_LEVELS ? level : DEFAULT_COMPRESSION_LEVEL
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load compression level:', error)
  }

  debugLog(`[STORAGE] Using default compression level: ${DEFAULT_COMPRESSION_LEVEL}`)
  return DEFAULT_COMPRESSION_LEVEL
}

// Save compression level to localStorage
function saveCompressionLevel(level: CompressionLevelPreset): void {
  try {
    localStorage.setItem(COMPRESSION_LEVEL_STORAGE_KEY, JSON.stringify(level))
    debugLog(`[STORAGE] Saved compression level: ${level}`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save compression level:', error)
  }
}

// Load connection history from localStorage
function loadConnectionHistory(): ConnectionHistoryEntry[] {
  try {
    const saved = localStorage.getItem(CONNECTION_HISTORY_STORAGE_KEY)
    if (saved !== null) {
      const history = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded connection history: ${history.length} entries`)
      return Array.isArray(history) ? history : []
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load connection history:', error)
  }

  debugLog('[STORAGE] No connection history found, starting with empty list')
  return []
}

// Save connection history to localStorage
function saveConnectionHistory(history: ConnectionHistoryEntry[]): void {
  try {
    // Keep only the most recent entries
    const trimmedHistory = history.slice(-MAX_HISTORY_ENTRIES)
    localStorage.setItem(CONNECTION_HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory))
    debugLog(`[STORAGE] Saved connection history: ${trimmedHistory.length} entries`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save connection history:', error)
  }
}

// Load connection method from localStorage
function loadConnectionMethod(): ConnectionMethod {
  try {
    const saved = localStorage.getItem(CONNECTION_METHOD_STORAGE_KEY)
    if (saved !== null) {
      const method = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded connection method: ${method}`)
      return method && method in CONNECTION_METHODS ? method : DEFAULT_CONNECTION_METHOD
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load connection method:', error)
  }

  debugLog(`[STORAGE] Using default connection method: ${DEFAULT_CONNECTION_METHOD}`)
  return DEFAULT_CONNECTION_METHOD
}

// Save connection method to localStorage
function saveConnectionMethod(method: ConnectionMethod): void {
  try {
    localStorage.setItem(CONNECTION_METHOD_STORAGE_KEY, JSON.stringify(method))
    debugLog(`[STORAGE] Saved connection method: ${method}`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save connection method:', error)
  }
}

// Load privacy mode from localStorage
function loadPrivacyMode(): boolean {
  try {
    const saved = localStorage.getItem(PRIVACY_MODE_STORAGE_KEY)
    if (saved !== null) {
      const enabled = JSON.parse(saved)
      debugLog(`[STORAGE] Loaded privacy mode: ${enabled}`)
      return enabled
    }
  } catch (error) {
    debugWarn('[STORAGE] Failed to load privacy mode:', error)
  }

  debugLog('[STORAGE] Using default privacy mode: false')
  return false
}

// Save privacy mode to localStorage
function savePrivacyMode(enabled: boolean): void {
  try {
    localStorage.setItem(PRIVACY_MODE_STORAGE_KEY, JSON.stringify(enabled))
    debugLog(`[STORAGE] Saved privacy mode: ${enabled}`)
  } catch (error) {
    debugWarn('[STORAGE] Failed to save privacy mode:', error)
  }
}

export function useFileTransfer() {
  const [isTransferring, setIsTransferring] = createSignal(false)
  const [connectedPeers, setConnectedPeers] = createSignal<string[]>([])
  const [compressionEnabled, setCompressionEnabled] = createSignal(loadCompressionSetting())
  const [autoAcceptFiles, setAutoAcceptFiles] = createSignal(loadAutoAcceptSetting())
  const [trustedPeers, setTrustedPeers] = createSignal<string[]>(loadTrustedPeers())
  const [maxFileSize, setMaxFileSize] = createSignal<number>(loadMaxFileSize())
  const [compressionLevel, setCompressionLevel] = createSignal<CompressionLevelPreset>(loadCompressionLevel())
  const [connectionHistory, setConnectionHistory] = createSignal<ConnectionHistoryEntry[]>(loadConnectionHistory())
  const [connectionMethod, setConnectionMethod] = createSignal<ConnectionMethod>(loadConnectionMethod())
  const [privacyMode, setPrivacyMode] = createSignal<boolean>(loadPrivacyMode())

  // Track active connections with their start times
  const activeConnections = new Map<string, number>()

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
    setWebRTCCompressionLevel,
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
    isFileSizeAllowed: () => isFileSizeAllowed,
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

  // Initialize WebRTC compression level with loaded value
  createEffect(() => {
    const level = compressionLevel()
    const numericLevel = COMPRESSION_LEVELS[level].level
    debugLog(`[INIT] Setting initial compression level: ${level} (${numericLevel})`)
    setWebRTCCompressionLevel(numericLevel)
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

  // Save to localStorage whenever max file size changes
  createEffect(() => {
    const size = maxFileSize()
    saveMaxFileSize(size)
  })

  // Save to localStorage whenever compression level changes
  createEffect(() => {
    const level = compressionLevel()
    saveCompressionLevel(level)
  })

  // Save to localStorage whenever connection history changes
  createEffect(() => {
    const history = connectionHistory()
    saveConnectionHistory(history)
  })

  // Save to localStorage whenever connection method changes
  createEffect(() => {
    const method = connectionMethod()
    saveConnectionMethod(method)
  })

  // Save to localStorage whenever privacy mode changes
  createEffect(() => {
    const enabled = privacyMode()
    savePrivacyMode(enabled)
    
    // If privacy mode is enabled, clear existing history
    if (enabled) {
      setConnectionHistory([])
      debugLog('[PRIVACY] Privacy mode enabled, clearing connection history')
    }
  })

  // Monitor connected peers for history tracking
  createEffect(() => {
    // Skip history tracking if privacy mode is enabled
    if (privacyMode()) return

    const currentPeers = connectedPeers()
    const now = Date.now()

    // Check for new connections
    currentPeers.forEach(peerId => {
      if (!activeConnections.has(peerId)) {
        activeConnections.set(peerId, now)
        addConnectionHistoryEntry(peerId, now)
        debugLog(`[CONNECTION_HISTORY] New connection: ${peerId}`)
      }
    })

    // Check for disconnections
    activeConnections.forEach((startTime, peerId) => {
      if (!currentPeers.includes(peerId)) {
        const duration = now - startTime
        updateConnectionHistoryEntry(peerId, now, duration)
        activeConnections.delete(peerId)
        debugLog(`[CONNECTION_HISTORY] Disconnection: ${peerId}, duration: ${duration}ms`)
      }
    })
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

  const isFileSizeAllowed = (fileSize: number): boolean => {
    const maxSize = maxFileSize()
    // 0 means unlimited
    if (maxSize === 0) return true
    return fileSize <= maxSize
  }

  const setMaxFileSizeFromPreset = (preset: FileSizePreset) => {
    const size = FILE_SIZE_PRESETS[preset]
    setMaxFileSize(size)
    debugLog(`[FILE_SIZE] Set max file size to ${preset}: ${size} bytes`)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return 'Unlimited'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  const handleCompressionLevelChange = (preset: CompressionLevelPreset) => {
    setCompressionLevel(preset)
    const numericLevel = COMPRESSION_LEVELS[preset].level
    setWebRTCCompressionLevel(numericLevel)
    debugLog(`[COMPRESSION] Level changed to: ${preset} (level ${numericLevel})`)
  }

  const addConnectionHistoryEntry = (peerId: string, connectedAt: number) => {
    setConnectionHistory(prev => {
      const existingIndex = prev.findIndex(entry => entry.peerId === peerId)
      const now = Date.now()
      
      if (existingIndex !== -1) {
        // Update existing entry
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          connectedAt,
          lastSeen: now,
          connectionCount: updated[existingIndex].connectionCount + 1,
          disconnectedAt: undefined,
          duration: undefined
        }
        return updated
      } else {
        // Add new entry
        const newEntry: ConnectionHistoryEntry = {
          peerId,
          connectedAt,
          lastSeen: now,
          filesTransferred: 0,
          totalBytesTransferred: 0,
          connectionCount: 1
        }
        return [...prev, newEntry].slice(-MAX_HISTORY_ENTRIES)
      }
    })
  }

  const updateConnectionHistoryEntry = (peerId: string, disconnectedAt: number, duration: number) => {
    setConnectionHistory(prev => {
      const existingIndex = prev.findIndex(entry => entry.peerId === peerId)
      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          disconnectedAt,
          duration,
          lastSeen: disconnectedAt
        }
        return updated
      }
      return prev
    })
  }

  const updateFileTransferStats = (peerId: string, fileSize: number) => {
    // Skip stats update if privacy mode is enabled
    if (privacyMode()) return

    setConnectionHistory(prev => {
      const existingIndex = prev.findIndex(entry => entry.peerId === peerId)
      if (existingIndex !== -1) {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          filesTransferred: updated[existingIndex].filesTransferred + 1,
          totalBytesTransferred: updated[existingIndex].totalBytesTransferred + fileSize,
          lastSeen: Date.now()
        }
        return updated
      }
      return prev
    })
  }

  const clearConnectionHistory = () => {
    setConnectionHistory([])
    debugLog('[CONNECTION_HISTORY] History cleared')
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
    return `${(ms / 3600000).toFixed(1)}h`
  }

  const handleConnectionMethodChange = (method: ConnectionMethod) => {
    setConnectionMethod(method)
    debugLog(`[CONNECTION_METHOD] Changed to: ${method}`)
    // Note: Actual WebRTC configuration would need to be updated here
    // This is a UI/preference setting that would be used by the connection manager
  }

  const handlePrivacyModeToggle = (enabled: boolean) => {
    setPrivacyMode(enabled)
    debugLog(`[PRIVACY] Privacy mode changed to: ${enabled}`)
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
    maxFileSize,
    setMaxFileSize,
    setMaxFileSizeFromPreset,
    isFileSizeAllowed,
    formatFileSize,
    compressionLevel,
    setCompressionLevel: handleCompressionLevelChange,
    connectionHistory,
    clearConnectionHistory,
    updateFileTransferStats,
    formatDuration,
    connectionMethod,
    setConnectionMethod: handleConnectionMethodChange,
    privacyMode,
    setPrivacyMode: handlePrivacyModeToggle,
  }
}

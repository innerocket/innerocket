import type { FileMetadata, FileTransferRequest, Peer } from '../../types'

export type { Peer }

export interface ConnectionQuality {
  type: 'slow' | 'medium' | 'fast'
  mbps: number
}

export interface ChunkInfo {
  size: number
  index: number
  transferSpeed: number
  progress: number
}

export interface FileTransferState {
  metadata: FileMetadata
  totalSize: number
  transferredBytes: number
  startTime: number
  isActive: boolean
}

export interface WebRTCCallbacks {
  onPeerConnected: (peer: Peer) => void
  onPeerDisconnected: (peerId: string) => void
  onFileTransferRequest: (request: FileTransferRequest) => void
  onFileChunk: (
    peerId: string,
    chunk: ArrayBuffer,
    metadata: FileMetadata,
    progress: number,
    chunkSize?: number,
    transferSpeed?: number,
    chunkIndex?: number,
    isCompressed?: boolean,
    originalChunkSize?: number,
    compressionRatio?: number
  ) => void
  onFileTransferComplete: (peerId: string, metadata: FileMetadata) => void
  onFileTransferAccepted: (peerId: string, metadata: FileMetadata) => void
  onFileTransferRejected: (peerId: string, metadata: FileMetadata) => void
}

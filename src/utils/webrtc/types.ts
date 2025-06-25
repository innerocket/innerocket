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
  metadata: any
  totalSize: number
  transferredBytes: number
  startTime: number
  isActive: boolean
}

export interface WebRTCCallbacks {
  onPeerConnected: (peer: any) => void
  onPeerDisconnected: (peerId: string) => void
  onFileTransferRequest: (request: any) => void
  onFileChunk: (
    peerId: string,
    chunk: ArrayBuffer,
    metadata: any,
    progress: number,
    chunkSize?: number,
    transferSpeed?: number,
    chunkIndex?: number
  ) => void
  onFileTransferComplete: (peerId: string, metadata: any) => void
  onFileTransferAccepted: (peerId: string, metadata: any) => void
  onFileTransferRejected: (peerId: string, metadata: any) => void
}

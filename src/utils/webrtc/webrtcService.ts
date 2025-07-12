import Sqlds from 'sqids'
import type { FileMetadata, FileTransferRequest } from '../../types'
import type { Peer } from './types'
import { ConnectionManager, type PeerData } from './connectionManager'
import { FileTransferService } from './fileTransferService'
import type { WebRTCCallbacks } from './types'

const sqlds = new Sqlds()

export class WebRTCService {
  private connectionManager: ConnectionManager
  private fileTransferService: FileTransferService
  private userPeerId: string // User-facing ID (without prefix)
  private addPrefixToId: (id: string) => string
  private removePrefixFromId: (id: string) => string
  private callbacks: Partial<WebRTCCallbacks> = {}

  constructor(
    peerId?: string,
    addPrefixToId?: (id: string) => string,
    removePrefixFromId?: (id: string) => string
  ) {
    // Use provided peerId or generate a new one if not provided
    this.userPeerId = peerId || sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])

    // Set up ID transformation functions
    this.addPrefixToId = addPrefixToId || ((id: string) => id)
    this.removePrefixFromId = removePrefixFromId || ((id: string) => id)

    // Create internal PeerJS ID with prefix
    const internalPeerId = this.addPrefixToId(this.userPeerId)

    // Initialize services with internal ID
    this.connectionManager = new ConnectionManager(internalPeerId)
    this.fileTransferService = new FileTransferService()

    // Set up callbacks with ID transformation
    this.setupCallbacks()
  }

  private setupCallbacks(): void {
    this.connectionManager.setCallbacks({
      onPeerConnected: (peer: Peer) => {
        // Convert internal ID back to user-facing ID
        const userFacingId = this.removePrefixFromId(peer.id)
        this.callbacks.onPeerConnected?.({ ...peer, id: userFacingId })
      },
      onPeerDisconnected: (peerId: string) => {
        // Convert internal ID back to user-facing ID
        const userFacingId = this.removePrefixFromId(peerId)
        this.callbacks.onPeerDisconnected?.(userFacingId)
      },
      onFileTransferRequest: (request: FileTransferRequest) => {
        // Convert internal ID back to user-facing ID
        const userFacingFromId = this.removePrefixFromId(request.from.id)
        this.callbacks.onFileTransferRequest?.({
          ...request,
          from: { ...request.from, id: userFacingFromId },
        })
      },
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
      ) => {
        // Convert internal ID back to user-facing ID
        const userFacingId = this.removePrefixFromId(peerId)
        this.callbacks.onFileChunk?.(
          userFacingId,
          chunk,
          metadata,
          progress,
          chunkSize,
          transferSpeed,
          chunkIndex,
          isCompressed,
          originalChunkSize,
          compressionRatio
        )
      },
      onFileTransferComplete: (peerId: string, metadata: FileMetadata) => {
        // Convert internal ID back to user-facing ID
        const userFacingId = this.removePrefixFromId(peerId)
        this.callbacks.onFileTransferComplete?.(userFacingId, metadata)
      },
      onFileTransferAccepted: (peerId: string, metadata: FileMetadata) => {
        // Convert internal ID back to user-facing ID
        const userFacingId = this.removePrefixFromId(peerId)
        this.callbacks.onFileTransferAccepted?.(userFacingId, metadata)
      },
      onFileTransferRejected: (peerId: string, metadata: FileMetadata) => {
        // Convert internal ID back to user-facing ID
        const userFacingId = this.removePrefixFromId(peerId)
        this.callbacks.onFileTransferRejected?.(userFacingId, metadata)
      },
    })
  }

  // Connection Management Methods
  public connectToPeer(userPeerId: string): void {
    // Convert user-facing ID to internal ID before connecting
    const internalPeerId = this.addPrefixToId(userPeerId)
    this.connectionManager.connectToPeer(internalPeerId)
  }

  public disconnectFromPeer(userPeerId: string): void {
    // Convert user-facing ID to internal ID before disconnecting
    const internalPeerId = this.addPrefixToId(userPeerId)
    this.connectionManager.disconnectFromPeer(internalPeerId)
  }

  public getMyPeerId(): string {
    // Return user-facing ID (without prefix)
    return this.userPeerId
  }

  public getDiscoveredPeers(): Peer[] {
    // Get peers and convert internal IDs back to user-facing IDs
    return this.connectionManager.getDiscoveredPeers().map(peer => ({
      ...peer,
      id: this.removePrefixFromId(peer.id),
    }))
  }

  // File Transfer Methods
  public async sendFileRequest(userPeerId: string, file: File): Promise<FileMetadata | null> {
    const metadata = await this.fileTransferService.createFileRequest(file)
    if (!metadata) return null

    // Convert user-facing ID to internal ID before sending
    const internalPeerId = this.addPrefixToId(userPeerId)
    const success = this.connectionManager.sendData(internalPeerId, {
      type: 'file-request',
      metadata,
      name: 'Anonymous', // You can set a name here
    })

    return success ? metadata : null
  }

  public sendFile(userPeerId: string, file: File, metadata: FileMetadata): void {
    // Convert user-facing ID to internal ID before sending
    const internalPeerId = this.addPrefixToId(userPeerId)
    const sendDataFn = (data: PeerData) => this.connectionManager.sendData(internalPeerId, data)
    this.fileTransferService.sendFile(sendDataFn, file, metadata, internalPeerId)
  }

  public acceptFileTransfer(userPeerId: string, metadata: FileMetadata): void {
    // Convert user-facing ID to internal ID before sending
    const internalPeerId = this.addPrefixToId(userPeerId)
    this.connectionManager.sendData(internalPeerId, {
      type: 'file-accept',
      metadata,
    })
  }

  public rejectFileTransfer(userPeerId: string, metadata: FileMetadata): void {
    // Convert user-facing ID to internal ID before sending
    const internalPeerId = this.addPrefixToId(userPeerId)
    this.connectionManager.sendData(internalPeerId, {
      type: 'file-reject',
      metadata,
    })
  }

  // Event Handler Setup Methods
  public setOnPeerConnected(callback: (peer: Peer) => void): void {
    this.callbacks.onPeerConnected = callback
  }

  public setOnPeerDisconnected(callback: (peerId: string) => void): void {
    this.callbacks.onPeerDisconnected = callback
  }

  public setOnFileTransferRequest(callback: (request: FileTransferRequest) => void): void {
    this.callbacks.onFileTransferRequest = callback
  }

  public setOnFileChunk(
    callback: (
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
  ): void {
    this.callbacks.onFileChunk = callback
  }

  public setOnFileTransferComplete(
    callback: (peerId: string, metadata: FileMetadata) => void
  ): void {
    this.callbacks.onFileTransferComplete = callback
  }

  public setOnFileTransferAccepted(
    callback: (peerId: string, metadata: FileMetadata) => void
  ): void {
    this.callbacks.onFileTransferAccepted = callback
  }

  public setOnFileTransferRejected(
    callback: (peerId: string, metadata: FileMetadata) => void
  ): void {
    this.callbacks.onFileTransferRejected = callback
  }

  // Additional utility methods
  public getActiveTransfers() {
    return this.fileTransferService.getActiveTransfers()
  }

  public cancelTransfer(transferId: string): void {
    this.fileTransferService.cancelTransfer(transferId)
  }

  // Compression methods
  public setCompressionEnabled(enabled: boolean): void {
    this.fileTransferService.setCompressionEnabled(enabled)
  }

  public getCompressionInfo() {
    return this.fileTransferService.getCompressionInfo()
  }

  public getCompressionStats(transferId: string) {
    return this.fileTransferService.getTotalCompressionSavings(transferId)
  }

  public processReceivedChunk(chunkData: any) {
    return this.fileTransferService.processReceivedChunk(chunkData)
  }
}

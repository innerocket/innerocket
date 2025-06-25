import { Peer as PeerJS } from 'peerjs'
import type { FileMetadata, Peer } from '../../types'
import type { WebRTCCallbacks } from './types'

type DataConnection = {
  peer: string
  open: boolean
  send(data: unknown): void
  close(): void
  on(event: string, callback: (...args: unknown[]) => void): void
}

// Define a type for the data sent between peers
export type PeerData = {
  type: 'file-request' | 'file-chunk' | 'file-complete' | 'file-accept' | 'file-reject'
  metadata: FileMetadata
  chunk?: ArrayBuffer
  progress?: number
  chunkSize?: number
  transferSpeed?: number
  chunkIndex?: number
  name?: string
}

export class ConnectionManager {
  private peer!: PeerJS
  private connections: Map<string, DataConnection> = new Map()
  private discoveredPeers: Map<string, Peer> = new Map()
  private myPeerId: string
  private callbacks: Partial<WebRTCCallbacks> = {}

  constructor(peerId: string) {
    this.myPeerId = peerId
    this.initializePeer()
  }

  private initializePeer(): void {
    // Initialize PeerJS with optimized configuration
    this.peer = new PeerJS(this.myPeerId, {
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
        iceCandidatePoolSize: 10,
      },
    })

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.peer.on('open', id => {
      console.log('My peer ID is:', id)
      this.myPeerId = id
    })

    this.peer.on('connection', conn => {
      this.handleIncomingConnection(conn)
    })

    this.peer.on('error', err => {
      console.error('PeerJS error:', err)
    })
  }

  private handleIncomingConnection(conn: DataConnection): void {
    const peerId = conn.peer

    conn.on('open', () => {
      console.log('Connected to peer:', peerId)
      this.connections.set(peerId, conn)
      this.discoveredPeers.set(peerId, { id: peerId })
      this.callbacks.onPeerConnected?.({ id: peerId })

      conn.on('data', (data: unknown) => {
        this.handleDataReceived(peerId, data as PeerData)
      })
    })

    conn.on('close', () => {
      this.handleDisconnection(peerId)
    })

    conn.on('error', (err: unknown) => {
      console.error('Connection error:', err)
      this.handleDisconnection(peerId)
    })
  }

  private handleDisconnection(peerId: string): void {
    console.log('Disconnected from peer:', peerId)
    this.connections.delete(peerId)
    this.discoveredPeers.delete(peerId)
    this.callbacks.onPeerDisconnected?.(peerId)
  }

  private handleDataReceived(peerId: string, data: PeerData): void {
    if (!data) return

    switch (data.type) {
      case 'file-request':
        this.callbacks.onFileTransferRequest?.({
          metadata: data.metadata,
          from: { id: peerId, name: data.name || 'Anonymous' },
        })
        break
      case 'file-chunk':
        this.callbacks.onFileChunk?.(
          peerId,
          data.chunk as ArrayBuffer,
          data.metadata,
          data.progress as number,
          data.chunkSize,
          data.transferSpeed,
          data.chunkIndex
        )
        break
      case 'file-complete':
        this.callbacks.onFileTransferComplete?.(peerId, data.metadata)
        break
      case 'file-accept':
        this.callbacks.onFileTransferAccepted?.(peerId, data.metadata)
        break
      case 'file-reject':
        this.callbacks.onFileTransferRejected?.(peerId, data.metadata)
        break
    }
  }

  public connectToPeer(peerId: string): void {
    if (this.connections.has(peerId)) {
      console.log('Already connected to peer:', peerId)
      return
    }

    const conn = this.peer.connect(peerId)

    conn.on('open', () => {
      console.log('Connected to peer:', peerId)
      this.connections.set(peerId, conn)
      this.discoveredPeers.set(peerId, { id: peerId })
      this.callbacks.onPeerConnected?.({ id: peerId })
    })

    conn.on('data', (data: unknown) => {
      this.handleDataReceived(peerId, data as PeerData)
    })

    conn.on('close', () => {
      this.handleDisconnection(peerId)
    })

    conn.on('error', (err: unknown) => {
      console.error('Connection error:', err)
      this.handleDisconnection(peerId)
    })
  }

  public disconnectFromPeer(peerId: string): void {
    const conn = this.connections.get(peerId)
    if (conn) {
      conn.close()
      this.connections.delete(peerId)
      this.discoveredPeers.delete(peerId)
      this.callbacks.onPeerDisconnected?.(peerId)
    }
  }

  public getConnection(peerId: string): DataConnection | undefined {
    return this.connections.get(peerId)
  }

  public getMyPeerId(): string {
    return this.myPeerId
  }

  public getDiscoveredPeers(): Peer[] {
    return Array.from(this.discoveredPeers.values())
  }

  public setCallbacks(callbacks: Partial<WebRTCCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  public sendData(peerId: string, data: PeerData): boolean {
    const conn = this.connections.get(peerId)
    if (!conn) {
      console.error('No connection to peer:', peerId)
      return false
    }

    conn.send(data)
    return true
  }
}

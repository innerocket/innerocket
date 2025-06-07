import { Peer as PeerJS } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import type { FileMetadata, FileTransferRequest, Peer } from '../types';
import { calculateChecksum } from './checksum';

export class WebRTCService {
  private peer: PeerJS;
  private connections: Map<string, any> = new Map();
  private onPeerConnected: (peer: Peer) => void = () => {};
  private onPeerDisconnected: (peerId: string) => void = () => {};
  private onFileTransferRequest: (request: FileTransferRequest) => void =
    () => {};
  private onFileChunk: (
    peerId: string,
    chunk: ArrayBuffer,
    metadata: FileMetadata,
    progress: number
  ) => void = () => {};
  private onFileTransferComplete: (
    peerId: string,
    metadata: FileMetadata
  ) => void = () => {};
  private discoveredPeers: Map<string, Peer> = new Map();
  private myPeerId: string;

  constructor(peerId?: string) {
    // Use provided peerId or generate a new one if not provided
    this.myPeerId = peerId || uuidv4();

    // Initialize PeerJS
    this.peer = new PeerJS(this.myPeerId, {
      // Using public PeerJS server for simplicity
      // In production, you might want to use your own server
      // but only for signaling, not for transferring files
      debug: 2,
    });

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.peer.on('open', (id) => {
      console.log('My peer ID is:', id);
      this.myPeerId = id;
    });

    this.peer.on('connection', (conn) => {
      const peerId = conn.peer;

      conn.on('open', () => {
        console.log('Connected to peer:', peerId);
        this.connections.set(peerId, conn);
        this.discoveredPeers.set(peerId, { id: peerId });
        this.onPeerConnected({ id: peerId });

        conn.on('data', (data) => {
          this.handleDataReceived(peerId, data);
        });
      });

      conn.on('close', () => {
        console.log('Disconnected from peer:', peerId);
        this.connections.delete(peerId);
        this.discoveredPeers.delete(peerId);
        this.onPeerDisconnected(peerId);
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        this.connections.delete(peerId);
        this.discoveredPeers.delete(peerId);
        this.onPeerDisconnected(peerId);
      });
    });

    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });
  }

  private handleDataReceived(peerId: string, data: any) {
    if (!data) return;

    if (data.type === 'file-request') {
      this.onFileTransferRequest({
        metadata: data.metadata,
        from: { id: peerId, name: data.name },
      });
    } else if (data.type === 'file-chunk') {
      this.onFileChunk(peerId, data.chunk, data.metadata, data.progress);
    } else if (data.type === 'file-complete') {
      this.onFileTransferComplete(peerId, data.metadata);
    }
  }

  public connectToPeer(peerId: string) {
    if (this.connections.has(peerId)) {
      console.log('Already connected to peer:', peerId);
      return;
    }

    const conn = this.peer.connect(peerId);

    conn.on('open', () => {
      console.log('Connected to peer:', peerId);
      this.connections.set(peerId, conn);
      this.discoveredPeers.set(peerId, { id: peerId });
      this.onPeerConnected({ id: peerId });
    });

    conn.on('data', (data) => {
      this.handleDataReceived(peerId, data);
    });

    conn.on('close', () => {
      console.log('Disconnected from peer:', peerId);
      this.connections.delete(peerId);
      this.discoveredPeers.delete(peerId);
      this.onPeerDisconnected(peerId);
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
      this.connections.delete(peerId);
      this.discoveredPeers.delete(peerId);
      this.onPeerDisconnected(peerId);
    });
  }

  public disconnectFromPeer(peerId: string) {
    const conn = this.connections.get(peerId);
    if (conn) {
      conn.close();
      this.connections.delete(peerId);
      this.discoveredPeers.delete(peerId);
      this.onPeerDisconnected(peerId);
    }
  }

  public async sendFileRequest(peerId: string, file: File) {
    const conn = this.connections.get(peerId);
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return;
    }

    // Calculate checksum for the file
    try {
      const checksum = await calculateChecksum(file);

      const metadata: FileMetadata = {
        id: uuidv4(),
        name: file.name,
        size: file.size,
        type: file.type,
        checksum: checksum,
      };

      conn.send({
        type: 'file-request',
        metadata,
        name: 'Anonymous', // You can set a name here
      });

      return metadata;
    } catch (error) {
      console.error('Error calculating checksum:', error);
      return null;
    }
  }

  public sendFile(peerId: string, file: File, metadata: FileMetadata) {
    const conn = this.connections.get(peerId);
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return;
    }

    const chunkSize = 16384; // 16KB chunks
    const reader = new FileReader();
    let offset = 0;

    const sendChunk = () => {
      if (offset >= file.size) {
        // File transfer complete
        conn.send({
          type: 'file-complete',
          metadata,
        });
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (!e.target) return;

      const chunk = e.target.result;
      conn.send({
        type: 'file-chunk',
        chunk,
        metadata,
        progress: Math.min(100, Math.floor((offset / file.size) * 100)),
      });

      offset += chunkSize;
      setTimeout(sendChunk, 0);
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };

    sendChunk();
  }

  public acceptFileTransfer(peerId: string, metadata: FileMetadata) {
    const conn = this.connections.get(peerId);
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return;
    }

    conn.send({
      type: 'file-accept',
      metadata,
    });
  }

  public rejectFileTransfer(peerId: string, metadata: FileMetadata) {
    const conn = this.connections.get(peerId);
    if (!conn) {
      console.error('No connection to peer:', peerId);
      return;
    }

    conn.send({
      type: 'file-reject',
      metadata,
    });
  }

  public getMyPeerId(): string {
    return this.myPeerId;
  }

  public getDiscoveredPeers(): Peer[] {
    return Array.from(this.discoveredPeers.values());
  }

  public setOnPeerConnected(callback: (peer: Peer) => void) {
    this.onPeerConnected = callback;
  }

  public setOnPeerDisconnected(callback: (peerId: string) => void) {
    this.onPeerDisconnected = callback;
  }

  public setOnFileTransferRequest(
    callback: (request: FileTransferRequest) => void
  ) {
    this.onFileTransferRequest = callback;
  }

  public setOnFileChunk(
    callback: (
      peerId: string,
      chunk: ArrayBuffer,
      metadata: FileMetadata,
      progress: number
    ) => void
  ) {
    this.onFileChunk = callback;
  }

  public setOnFileTransferComplete(
    callback: (peerId: string, metadata: FileMetadata) => void
  ) {
    this.onFileTransferComplete = callback;
  }
}

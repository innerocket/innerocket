import { Peer as PeerJS } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import type { FileMetadata, FileTransferRequest, Peer } from '../types';
import { calculateChecksum } from './checksum';
import { createFileChunkWorker } from './workerLoader';

// Configuration constants
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
const MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB for very fast connections
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

// Add adaptive chunk sizing based on connection quality
function getOptimalChunkSize(
  fileSize: number,
  connectionQuality: 'slow' | 'medium' | 'fast' = 'medium'
): number {
  if (fileSize < 1024 * 1024) {
    // Files smaller than 1MB
    return 256 * 1024; // Use smaller chunks for tiny files
  }

  switch (connectionQuality) {
    case 'slow':
      return 512 * 1024; // 512KB for slow connections
    case 'fast':
      return MAX_CHUNK_SIZE; // 4MB for fast connections
    case 'medium':
    default:
      return DEFAULT_CHUNK_SIZE; // 1MB for medium connections
  }
}

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
    progress: number,
    chunkSize?: number,
    transferSpeed?: number,
    chunkIndex?: number
  ) => void = () => {};
  private onFileTransferComplete: (
    peerId: string,
    metadata: FileMetadata
  ) => void = () => {};
  private onFileTransferAccepted: (
    peerId: string,
    metadata: FileMetadata
  ) => void = () => {};
  private onFileTransferRejected: (
    peerId: string,
    metadata: FileMetadata
  ) => void = () => {};
  private discoveredPeers: Map<string, Peer> = new Map();
  private myPeerId: string;

  constructor(peerId?: string) {
    // Use provided peerId or generate a new one if not provided
    this.myPeerId = peerId || uuidv4();

    // Initialize PeerJS with optimized configuration
    this.peer = new PeerJS(this.myPeerId, {
      // Using public PeerJS server for simplicity
      // In production, you might want to use your own server
      // but only for signaling, not for transferring files
      debug: 2,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
        iceCandidatePoolSize: 10,
      },
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
      this.onFileChunk(
        peerId,
        data.chunk,
        data.metadata,
        data.progress,
        data.chunkSize,
        data.transferSpeed,
        data.chunkIndex
      );
    } else if (data.type === 'file-complete') {
      this.onFileTransferComplete(peerId, data.metadata);
    } else if (data.type === 'file-accept') {
      this.onFileTransferAccepted(peerId, data.metadata);
    } else if (data.type === 'file-reject') {
      this.onFileTransferRejected(peerId, data.metadata);
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

    // Use web worker for large files
    if (file.size > LARGE_FILE_THRESHOLD && typeof Worker !== 'undefined') {
      this.sendFileWithWorker(conn, file, metadata);
    } else {
      this.sendFileStandard(conn, file, metadata);
    }
  }

  private sendFileStandard(conn: any, file: File, metadata: FileMetadata) {
    // Start with default chunk size
    let chunkSize = getOptimalChunkSize(file.size, 'medium');
    let connectionQuality: 'slow' | 'medium' | 'fast' = 'medium';
    const reader = new FileReader();
    let offset = 0;
    let chunkIndex = 0;
    let lastSendTime = 0;
    let transferRates: number[] = [];
    let consecutiveSlowChunks = 0;
    let consecutiveFastChunks = 0;
    let currentTransferSpeed = 0;

    const sendChunk = () => {
      if (offset >= file.size) {
        // File transfer complete - always send 100% progress
        conn.send({
          type: 'file-complete',
          metadata,
          progress: 100,
        });
        return;
      }

      const slice = file.slice(offset, offset + chunkSize);
      reader.readAsArrayBuffer(slice);
    };

    reader.onload = (e) => {
      if (!e.target) return;

      const now = Date.now();
      const chunk = e.target.result;
      if (!(chunk instanceof ArrayBuffer)) return;

      const progress = Math.min(
        100,
        Math.floor(((offset + chunk.byteLength) / file.size) * 100)
      );

      // Send the chunk
      conn.send({
        type: 'file-chunk',
        chunk,
        metadata,
        progress,
        chunkSize,
        transferSpeed: currentTransferSpeed,
        chunkIndex,
      });

      // Update sender's progress too via event
      if (this.onFileChunk) {
        this.onFileChunk(
          conn.peer,
          chunk,
          metadata,
          progress,
          chunkSize,
          currentTransferSpeed,
          chunkIndex
        );
      }

      // Measure transfer rate if not the first chunk
      if (lastSendTime > 0 && chunk) {
        const timeTaken = now - lastSendTime; // ms
        const bytesPerMs = chunk.byteLength / timeTaken;
        const mbps = (bytesPerMs * 1000) / (1024 * 1024);
        currentTransferSpeed = mbps;

        // Keep last 5 transfer rates for averaging
        transferRates.push(mbps);
        if (transferRates.length > 5) transferRates.shift();

        // Calculate average transfer rate
        const avgMbps =
          transferRates.reduce((sum, rate) => sum + rate, 0) /
          transferRates.length;

        // Dynamically adjust chunk size based on transfer rate
        if (avgMbps > 8) {
          // Very fast connection (>8 MB/s)
          consecutiveFastChunks++;
          consecutiveSlowChunks = 0;
          if (consecutiveFastChunks >= 3 && chunkSize < MAX_CHUNK_SIZE) {
            chunkSize = Math.min(chunkSize * 1.5, MAX_CHUNK_SIZE);
            connectionQuality = 'fast';
            consecutiveFastChunks = 0;
          }
        } else if (avgMbps < 1) {
          // Slow connection (<1 MB/s)
          consecutiveSlowChunks++;
          consecutiveFastChunks = 0;
          if (consecutiveSlowChunks >= 2 && chunkSize > 256 * 1024) {
            chunkSize = Math.max(chunkSize / 1.5, 256 * 1024);
            connectionQuality = 'slow';
            consecutiveSlowChunks = 0;
          }
        } else {
          // Medium connection, use default chunk size
          connectionQuality = 'medium';
          chunkSize = DEFAULT_CHUNK_SIZE;
          consecutiveFastChunks = 0;
          consecutiveSlowChunks = 0;
        }
      }

      // Update offset for next chunk
      offset += chunk.byteLength;
      chunkIndex++;
      lastSendTime = now;

      // Optimize the delay between chunks based on transfer rate
      const nextChunkDelay =
        file.size > 100 * 1024 * 1024
          ? connectionQuality === 'slow'
            ? 50
            : 10 // For files > 100MB
          : connectionQuality === 'slow'
          ? 25
          : 0; // For smaller files, use minimal or no delay

      setTimeout(sendChunk, nextChunkDelay);
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
    };

    sendChunk();
  }

  private sendFileWithWorker(conn: any, file: File, metadata: FileMetadata) {
    try {
      const worker = createFileChunkWorker();
      let isCancelled = false;

      const cleanup = () => {
        isCancelled = true;
        worker.terminate();
        console.log(`Worker for transfer ${metadata.id} terminated.`);
      };

      conn.on('close', cleanup);
      conn.on('error', cleanup);

      const processFile = async () => {
        let offset = 0;
        let chunkSize = getOptimalChunkSize(file.size, 'medium');

        while (offset < file.size && !isCancelled) {
          const chunkDataPromise = new Promise<{
            chunk: ArrayBuffer;
            nextOffset: number;
            progress: number;
            metadata: { index: number };
          }>((resolve, reject) => {
            const messageListener = (e: MessageEvent) => {
              const data = e.data;
              if (data.type === 'chunk' && data.offset === offset) {
                worker.removeEventListener('message', messageListener);
                resolve(data);
              } else if (data.type === 'error') {
                worker.removeEventListener('message', messageListener);
                reject(new Error(data.error));
              }
            };

            worker.addEventListener('message', messageListener);

            worker.postMessage({
              action: 'process',
              file,
              chunkSize,
              offset,
            });
          });

          try {
            const {
              chunk,
              nextOffset,
              progress,
              metadata: chunkMeta,
            } = await chunkDataPromise;

            if (isCancelled) break;

            conn.send({
              type: 'file-chunk',
              chunk,
              metadata,
              progress,
              chunkSize: chunk.byteLength,
              chunkIndex: chunkMeta.index,
            });

            // Update sender's progress too via event
            if (this.onFileChunk) {
              this.onFileChunk(
                conn.peer,
                chunk,
                metadata,
                progress,
                chunk.byteLength,
                0, // Transfer speed not available in worker mode
                chunkMeta.index
              );
            }

            offset = nextOffset;
          } catch (error) {
            console.error('Error processing chunk in worker:', error);
            cleanup();
            break;
          }
        }

        if (!isCancelled) {
          conn.send({
            type: 'file-complete',
            metadata,
            progress: 100,
          });
          cleanup();
        }
      };

      processFile();
    } catch (error) {
      console.error(
        'Failed to create worker, falling back to standard method:',
        error
      );
      this.sendFileStandard(conn, file, metadata);
    }
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
      progress: number,
      chunkSize?: number,
      transferSpeed?: number,
      chunkIndex?: number
    ) => void
  ) {
    this.onFileChunk = callback;
  }

  public setOnFileTransferComplete(
    callback: (peerId: string, metadata: FileMetadata) => void
  ) {
    this.onFileTransferComplete = callback;
  }

  public setOnFileTransferAccepted(
    callback: (peerId: string, metadata: FileMetadata) => void
  ) {
    this.onFileTransferAccepted = callback;
  }

  public setOnFileTransferRejected(
    callback: (peerId: string, metadata: FileMetadata) => void
  ) {
    this.onFileTransferRejected = callback;
  }
}

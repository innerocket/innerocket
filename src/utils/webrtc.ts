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
    transferSpeed?: number
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
        data.transferSpeed
      );
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
    let lastSendTime = 0;
    let transferRates: number[] = [];
    let consecutiveSlowChunks = 0;
    let consecutiveFastChunks = 0;
    let currentTransferSpeed = 0;

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

      const now = Date.now();
      const chunk = e.target.result;
      if (!(chunk instanceof ArrayBuffer)) return;

      const progress = Math.min(100, Math.floor((offset / file.size) * 100));

      // Send the chunk
      conn.send({
        type: 'file-chunk',
        chunk,
        metadata,
        progress,
        chunkSize,
        transferSpeed: currentTransferSpeed,
      });

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
      offset += chunkSize;
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
      // Create web worker from external file
      const worker = createFileChunkWorker();

      // Initial parameters
      let chunkSize = getOptimalChunkSize(file.size, 'medium');
      let offset = 0;
      let lastSendTime = 0;
      let transferRates: number[] = [];
      let connectionQuality: 'slow' | 'medium' | 'fast' = 'medium';
      let currentTransferSpeed = 0;

      // Set up worker message handler
      worker.onmessage = (e) => {
        const data = e.data;

        if (data.type === 'chunk') {
          const now = Date.now();
          const chunk = data.chunk;
          const progress = data.progress;

          // Send the chunk
          conn.send({
            type: 'file-chunk',
            chunk,
            metadata,
            progress,
            chunkSize,
            transferSpeed: currentTransferSpeed,
          });

          // Process transfer rate
          if (lastSendTime > 0) {
            const timeTaken = now - lastSendTime;
            const bytesPerMs = chunk.byteLength / timeTaken;
            currentTransferSpeed = (bytesPerMs * 1000) / (1024 * 1024);

            // Ask worker to calculate next optimal chunk size
            worker.postMessage({
              action: 'adjustSize',
              timeTaken,
              lastChunkSize: chunk.byteLength,
              transferRates,
              chunkSize,
              maxChunkSize: MAX_CHUNK_SIZE,
            });
          }

          // Update for next chunk
          offset = data.nextOffset;
          lastSendTime = now;

          // If we're done, complete the transfer
          if (offset >= file.size) {
            // File transfer complete
            conn.send({
              type: 'file-complete',
              metadata,
            });

            // Clean up worker
            worker.terminate();
            return;
          }

          // Request next chunk after a delay based on connection quality
          const nextChunkDelay =
            file.size > 100 * 1024 * 1024
              ? connectionQuality === 'slow'
                ? 50
                : 10 // For files > 100MB
              : connectionQuality === 'slow'
              ? 25
              : 0; // For smaller files, use minimal or no delay

          setTimeout(() => {
            worker.postMessage({
              action: 'process',
              file,
              chunkSize,
              offset,
              maxChunkSize: MAX_CHUNK_SIZE,
            });
          }, nextChunkDelay);
        } else if (data.type === 'sizeAdjusted') {
          // Update chunk size and connection quality
          chunkSize = data.newChunkSize;
          connectionQuality = data.connectionQuality;
          transferRates = data.transferRates;
        } else if (data.type === 'error') {
          console.error('Worker error:', data.error);
          // Fallback to standard method if worker fails
          this.sendFileStandard(conn, file, metadata);
          worker.terminate();
        }
      };

      // Set up error handler
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Fallback to standard method if worker fails
        this.sendFileStandard(conn, file, metadata);
        worker.terminate();
      };

      // Start the process
      worker.postMessage({
        action: 'process',
        file,
        chunkSize,
        offset,
        maxChunkSize: MAX_CHUNK_SIZE,
      });
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
      transferSpeed?: number
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

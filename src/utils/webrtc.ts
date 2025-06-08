import { Peer as PeerJS } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import type {
  FECChunkMetadata,
  FileMetadata,
  FileTransferRequest,
  Peer,
} from '../types';
import { calculateChecksum } from './checksum';
import { createFileChunkWorker } from './workerLoader';
import { FECEncoder } from './fec';

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
    fecMetadata?: FECChunkMetadata
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
        data.transferSpeed,
        data.fecMetadata
      );
    } else if (data.type === 'file-parity-chunk') {
      // Handle parity chunks separately, with special FEC metadata
      this.onFileChunk(
        peerId,
        data.chunk,
        data.metadata,
        data.progress,
        data.chunkSize,
        data.transferSpeed,
        {
          index: data.parityIndex,
          totalChunks: data.totalParityChunks,
          isParityChunk: true,
          chunkMap: data.chunkMap,
          blockOffset: data.blockOffset,
          blockSize: data.blockSize,
        }
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

  public async sendFileRequest(
    peerId: string,
    file: File,
    useFEC: boolean = true
  ) {
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
        useFEC: useFEC,
        // Use an appropriate parity ratio based on file size
        fecParityRatio: file.size > 100 * 1024 * 1024 ? 0.1 : 0.2, // 10% for large files, 20% for smaller ones
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

    // Determine whether to use FEC
    const useFEC = metadata.useFEC !== undefined ? metadata.useFEC : true;

    // Use web worker for large files
    if (file.size > LARGE_FILE_THRESHOLD && typeof Worker !== 'undefined') {
      this.sendFileWithWorker(conn, file, metadata, useFEC);
    } else {
      this.sendFileStandard(conn, file, metadata, useFEC);
    }
  }

  private sendFileStandard(
    conn: any,
    file: File,
    metadata: FileMetadata,
    useFEC: boolean = false
  ) {
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

    // FEC setup
    const fecEnabled = useFEC && file.size > 512 * 1024; // Only use FEC for files > 512KB
    const fecEncoder = fecEnabled ? new FECEncoder(chunkSize) : null;
    const fecBlockSize = fecEnabled
      ? Math.min(10 * chunkSize, 5 * 1024 * 1024)
      : 0; // Process 10 chunks per FEC block, max 5MB

    // Buffers for FEC block processing
    const fecBuffer: ArrayBuffer[] = [];
    let fecBlockStartOffset = 0;

    const sendChunk = () => {
      if (offset >= file.size) {
        // Send any remaining FEC parity chunks before completing
        if (fecEnabled && fecBuffer.length > 0 && fecEncoder) {
          sendFECParityChunks();
        }

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

    // Process and send FEC parity chunks for the current buffer
    const sendFECParityChunks = () => {
      if (!fecEnabled || !fecEncoder || fecBuffer.length === 0) return;

      // Generate parity chunks
      const { parityChunks, chunkMap } = fecEncoder.encodeChunks(fecBuffer);

      // Send each parity chunk
      for (let i = 0; i < parityChunks.length; i++) {
        conn.send({
          type: 'file-parity-chunk',
          chunk: parityChunks[i],
          metadata,
          progress: Math.min(
            100,
            Math.floor(((fecBlockStartOffset + fecBlockSize) / file.size) * 100)
          ),
          chunkSize,
          transferSpeed: currentTransferSpeed,
          parityIndex: i,
          totalParityChunks: parityChunks.length,
          chunkMap: chunkMap,
          blockOffset: fecBlockStartOffset,
          blockSize: fecBlockSize,
        });
      }

      // Reset FEC buffer and update block start offset for next block
      fecBuffer.length = 0;
      fecBlockStartOffset = offset;
    };

    reader.onload = (e) => {
      if (!e.target) return;

      const now = Date.now();
      const chunk = e.target.result;
      if (!(chunk instanceof ArrayBuffer)) return;

      const progress = Math.min(100, Math.floor((offset / file.size) * 100));

      // If FEC is enabled, add to buffer for batch processing
      if (fecEnabled && fecEncoder) {
        fecBuffer.push(chunk);

        // Process FEC block when we've collected enough chunks or reached the end
        const isLastChunk = offset + chunkSize >= file.size;
        const isBlockFull =
          fecBuffer.length >= Math.floor(fecBlockSize / chunkSize);

        if (isBlockFull || isLastChunk) {
          sendFECParityChunks();
        }
      }

      // Create FEC chunk metadata if enabled
      const fecMetadata = fecEnabled
        ? {
            index: Math.floor(offset / chunkSize),
            totalChunks: Math.ceil(file.size / chunkSize),
            isParityChunk: false,
          }
        : undefined;

      // Send the chunk
      conn.send({
        type: 'file-chunk',
        chunk,
        metadata,
        progress,
        chunkSize,
        transferSpeed: currentTransferSpeed,
        fecMetadata,
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

  private sendFileWithWorker(
    conn: any,
    file: File,
    metadata: FileMetadata,
    useFEC: boolean = false
  ) {
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

      // FEC setup
      const fecEnabled = useFEC && file.size > 512 * 1024;
      const fecBlockSize = fecEnabled
        ? Math.min(10 * chunkSize, 5 * 1024 * 1024)
        : 0;
      const parityRatio = metadata.fecParityRatio || 0.2;
      const parityChunksPerBlock = fecEnabled
        ? Math.max(1, Math.ceil((fecBlockSize / chunkSize) * parityRatio))
        : 0;

      // Set up worker message handler
      worker.onmessage = (e) => {
        const data = e.data;

        if (data.type === 'chunk') {
          const now = Date.now();
          const chunk = data.chunk;
          const progress = data.progress;

          // Create FEC metadata if enabled
          const fecMetadata = fecEnabled
            ? {
                index: data.metadata
                  ? data.metadata.index
                  : Math.floor(offset / chunkSize),
                totalChunks: data.metadata
                  ? data.metadata.totalChunks
                  : Math.ceil(file.size / chunkSize),
                isParityChunk: false,
              }
            : undefined;

          // Send the chunk
          conn.send({
            type: 'file-chunk',
            chunk,
            metadata,
            progress,
            chunkSize,
            transferSpeed: currentTransferSpeed,
            fecMetadata,
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
              progress: 100,
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
            // Process FEC block if needed
            if (
              fecEnabled &&
              Math.floor(offset / fecBlockSize) >
                Math.floor((offset - chunkSize) / fecBlockSize)
            ) {
              // We've crossed a block boundary, process the previous block
              const blockStartOffset =
                Math.floor((offset - chunkSize) / fecBlockSize) * fecBlockSize;
              worker.postMessage({
                action: 'processFEC',
                fileBlob: file,
                startOffset: blockStartOffset,
                blockSize: Math.min(fecBlockSize, file.size - blockStartOffset),
                parityCount: parityChunksPerBlock,
              });
            }

            // Continue with normal chunk processing
            worker.postMessage({
              action: 'process',
              file,
              chunkSize,
              offset,
              maxChunkSize: MAX_CHUNK_SIZE,
              useFEC: fecEnabled,
            });
          }, nextChunkDelay);
        } else if (data.type === 'sizeAdjusted') {
          // Update chunk size and connection quality
          chunkSize = data.newChunkSize;
          connectionQuality = data.connectionQuality;
          transferRates = data.transferRates;
        } else if (data.type === 'parityChunk') {
          // Handle parity chunk from worker
          conn.send({
            type: 'file-parity-chunk',
            chunk: data.chunk,
            metadata,
            progress: data.progress,
            chunkSize,
            transferSpeed: currentTransferSpeed,
            parityIndex: data.parityIndex,
            totalParityChunks: data.totalParityChunks,
            chunkMap: data.chunkMap,
            blockOffset: data.startOffset,
            blockSize: data.blockSize,
          });
        } else if (data.type === 'fecBlockComplete') {
          // FEC block processing is now separate from file completion
          // We no longer wait for FEC to complete before ending the transfer
          console.log('FEC block processing complete');
        } else if (data.type === 'error') {
          console.error('Worker error:', data.error);
          // Fallback to standard method if worker fails
          this.sendFileStandard(conn, file, metadata, useFEC);
          worker.terminate();
        }
      };

      // Set up error handler
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        // Fallback to standard method if worker fails
        this.sendFileStandard(conn, file, metadata, useFEC);
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
      this.sendFileStandard(conn, file, metadata, useFEC);
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
      fecMetadata?: FECChunkMetadata
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

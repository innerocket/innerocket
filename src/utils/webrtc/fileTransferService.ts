import { v4 as uuidv4 } from 'uuid';
import type { FileMetadata } from '../../types';
import { calculateChecksum } from '../checksum';
import { createFileChunkWorker } from '../workerLoader';
import { ChunkProcessor } from './chunkProcessor';
import type {
  ConnectionQuality,
  FileTransferState,
  WebRTCCallbacks,
} from './types';

const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024; // 100MB

export class FileTransferService {
  private chunkProcessor: ChunkProcessor;
  private activeTransfers: Map<string, FileTransferState> = new Map();
  private callbacks: Partial<WebRTCCallbacks> = {};

  constructor() {
    this.chunkProcessor = new ChunkProcessor();
  }

  public setCallbacks(callbacks: Partial<WebRTCCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public async createFileRequest(file: File): Promise<FileMetadata | null> {
    try {
      const checksum = await calculateChecksum(file);

      const metadata: FileMetadata = {
        id: uuidv4(),
        name: file.name,
        size: file.size,
        type: file.type,
        checksum: checksum,
      };

      return metadata;
    } catch (error) {
      console.error('Error calculating checksum:', error);
      return null;
    }
  }

  public sendFile(
    sendDataFn: (data: any) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): void {
    // Use web worker for large files
    if (file.size > LARGE_FILE_THRESHOLD && typeof Worker !== 'undefined') {
      this.sendFileWithWorker(sendDataFn, file, metadata, peerId);
    } else {
      this.sendFileStandard(sendDataFn, file, metadata, peerId);
    }
  }

  private sendFileStandard(
    sendDataFn: (data: any) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): void {
    this.chunkProcessor.reset();
    let chunkSize = this.chunkProcessor.getOptimalChunkSize(
      file.size,
      'medium'
    );
    let connectionQuality: ConnectionQuality['type'] = 'medium';

    const reader = new FileReader();
    let offset = 0;
    let chunkIndex = 0;
    let lastSendTime = 0;
    let currentTransferSpeed = 0;

    const sendChunk = () => {
      if (offset >= file.size) {
        // File transfer complete - always send 100% progress
        sendDataFn({
          type: 'file-complete',
          metadata,
          progress: 100,
        });
        this.activeTransfers.delete(metadata.id);
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
      sendDataFn({
        type: 'file-chunk',
        chunk,
        metadata,
        progress,
        chunkSize,
        transferSpeed: currentTransferSpeed,
        chunkIndex,
      });

      // Update sender's progress too via event
      this.callbacks.onFileChunk?.(
        peerId,
        chunk,
        metadata,
        progress,
        chunkSize,
        currentTransferSpeed,
        chunkIndex
      );

      // Measure transfer rate if not the first chunk
      if (lastSendTime > 0 && chunk) {
        const timeTaken = now - lastSendTime; // ms
        const transferData = this.chunkProcessor.updateTransferRate(
          chunk.byteLength,
          timeTaken
        );

        chunkSize = transferData.newChunkSize;
        currentTransferSpeed = transferData.transferSpeed;
        connectionQuality = transferData.connectionQuality;
      }

      // Update offset for next chunk
      offset += chunk.byteLength;
      chunkIndex++;
      lastSendTime = now;

      // Optimize the delay between chunks based on transfer rate
      const nextChunkDelay = this.chunkProcessor.getOptimalDelay(
        file.size,
        connectionQuality
      );

      setTimeout(sendChunk, nextChunkDelay);
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      this.activeTransfers.delete(metadata.id);
    };

    // Track this transfer
    this.activeTransfers.set(metadata.id, {
      metadata,
      totalSize: file.size,
      transferredBytes: 0,
      startTime: Date.now(),
      isActive: true,
    });

    sendChunk();
  }

  private sendFileWithWorker(
    sendDataFn: (data: any) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): void {
    try {
      const worker = createFileChunkWorker();
      let isCancelled = false;

      const cleanup = () => {
        isCancelled = true;
        worker.terminate();
        this.activeTransfers.delete(metadata.id);
        console.log(`Worker for transfer ${metadata.id} terminated.`);
      };

      // Track this transfer
      this.activeTransfers.set(metadata.id, {
        metadata,
        totalSize: file.size,
        transferredBytes: 0,
        startTime: Date.now(),
        isActive: true,
      });

      const processFile = async () => {
        let offset = 0;
        let chunkSize = this.chunkProcessor.getOptimalChunkSize(
          file.size,
          'medium'
        );

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

            sendDataFn({
              type: 'file-chunk',
              chunk,
              metadata,
              progress,
              chunkSize: chunk.byteLength,
              chunkIndex: chunkMeta.index,
            });

            // Update sender's progress too via event
            this.callbacks.onFileChunk?.(
              peerId,
              chunk,
              metadata,
              progress,
              chunk.byteLength,
              0, // Transfer speed not available in worker mode
              chunkMeta.index
            );

            offset = nextOffset;
          } catch (error) {
            console.error('Error processing chunk in worker:', error);
            cleanup();
            break;
          }
        }

        if (!isCancelled) {
          sendDataFn({
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
      this.sendFileStandard(sendDataFn, file, metadata, peerId);
    }
  }

  public getActiveTransfers(): FileTransferState[] {
    return Array.from(this.activeTransfers.values());
  }

  public cancelTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId);
    if (transfer) {
      transfer.isActive = false;
      this.activeTransfers.delete(transferId);
    }
  }
}

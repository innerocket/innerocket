import type { ConnectionQuality } from './types';

// Configuration constants
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB
const MAX_CHUNK_SIZE = 4 * 1024 * 1024; // 4MB for very fast connections
const MIN_CHUNK_SIZE = 256 * 1024; // 256KB minimum

export class ChunkProcessor {
  private transferRates: number[] = [];
  private consecutiveSlowChunks = 0;
  private consecutiveFastChunks = 0;
  private currentChunkSize = DEFAULT_CHUNK_SIZE;
  private connectionQuality: ConnectionQuality['type'] = 'medium';

  /**
   * Get optimal chunk size based on file size and connection quality
   */
  public getOptimalChunkSize(
    fileSize: number,
    connectionQuality: ConnectionQuality['type'] = 'medium'
  ): number {
    if (fileSize < 1024 * 1024) {
      // Files smaller than 1MB
      return MIN_CHUNK_SIZE; // Use smaller chunks for tiny files
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

  /**
   * Update transfer rate and adjust chunk size dynamically
   */
  public updateTransferRate(
    chunkSize: number,
    timeTaken: number
  ): {
    newChunkSize: number;
    transferSpeed: number;
    connectionQuality: ConnectionQuality['type'];
  } {
    const bytesPerMs = chunkSize / timeTaken;
    const mbps = (bytesPerMs * 1000) / (1024 * 1024);

    // Keep last 5 transfer rates for averaging
    this.transferRates.push(mbps);
    if (this.transferRates.length > 5) this.transferRates.shift();

    // Calculate average transfer rate
    const avgMbps =
      this.transferRates.reduce((sum, rate) => sum + rate, 0) /
      this.transferRates.length;

    // Dynamically adjust chunk size based on transfer rate
    if (avgMbps > 8) {
      // Very fast connection (>8 MB/s)
      this.consecutiveFastChunks++;
      this.consecutiveSlowChunks = 0;
      if (
        this.consecutiveFastChunks >= 3 &&
        this.currentChunkSize < MAX_CHUNK_SIZE
      ) {
        this.currentChunkSize = Math.min(
          this.currentChunkSize * 1.5,
          MAX_CHUNK_SIZE
        );
        this.connectionQuality = 'fast';
        this.consecutiveFastChunks = 0;
      }
    } else if (avgMbps < 1) {
      // Slow connection (<1 MB/s)
      this.consecutiveSlowChunks++;
      this.consecutiveFastChunks = 0;
      if (
        this.consecutiveSlowChunks >= 2 &&
        this.currentChunkSize > MIN_CHUNK_SIZE
      ) {
        this.currentChunkSize = Math.max(
          this.currentChunkSize / 1.5,
          MIN_CHUNK_SIZE
        );
        this.connectionQuality = 'slow';
        this.consecutiveSlowChunks = 0;
      }
    } else {
      // Medium connection, use default chunk size
      this.connectionQuality = 'medium';
      this.currentChunkSize = DEFAULT_CHUNK_SIZE;
      this.consecutiveFastChunks = 0;
      this.consecutiveSlowChunks = 0;
    }

    return {
      newChunkSize: this.currentChunkSize,
      transferSpeed: mbps,
      connectionQuality: this.connectionQuality,
    };
  }

  /**
   * Calculate optimal delay between chunks based on connection quality and file size
   */
  public getOptimalDelay(
    fileSize: number,
    connectionQuality: ConnectionQuality['type']
  ): number {
    if (fileSize > 100 * 1024 * 1024) {
      // Files > 100MB
      return connectionQuality === 'slow' ? 50 : 10;
    }
    // Smaller files
    return connectionQuality === 'slow' ? 25 : 0;
  }

  /**
   * Reset processor state for new transfer
   */
  public reset(): void {
    this.transferRates = [];
    this.consecutiveSlowChunks = 0;
    this.consecutiveFastChunks = 0;
    this.currentChunkSize = DEFAULT_CHUNK_SIZE;
    this.connectionQuality = 'medium';
  }
}

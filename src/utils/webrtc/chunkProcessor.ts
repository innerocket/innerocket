import type { ConnectionQuality } from './types'
import { compressDataSync, decompressDataSync, shouldCompress } from '../compressionUtils'
import { debugLog, logger } from '../logger'

// Configuration constants
const DEFAULT_CHUNK_SIZE = 1024 * 1024 // 1MB
const MAX_CHUNK_SIZE = 4 * 1024 * 1024 // 4MB for very fast connections
const MIN_CHUNK_SIZE = 256 * 1024 // 256KB minimum

export interface ChunkData {
  data: Uint8Array
  index: number
  isCompressed: boolean
  originalSize: number
  compressionRatio?: number
}

export class ChunkProcessor {
  private transferRates: number[] = []
  private consecutiveSlowChunks = 0
  private consecutiveFastChunks = 0
  private currentChunkSize = DEFAULT_CHUNK_SIZE
  private connectionQuality: ConnectionQuality['type'] = 'medium'
  private compressionEnabled = true
  private userCompressionLevel: number = 6 // Default to balanced level

  /**
   * Get optimal chunk size based on file size and connection quality
   */
  public getOptimalChunkSize(
    fileSize: number,
    connectionQuality: ConnectionQuality['type'] = 'medium'
  ): number {
    if (fileSize < 1024 * 1024) {
      // Files smaller than 1MB
      return MIN_CHUNK_SIZE // Use smaller chunks for tiny files
    }

    switch (connectionQuality) {
      case 'slow':
        return 512 * 1024 // 512KB for slow connections
      case 'fast':
        return MAX_CHUNK_SIZE // 4MB for fast connections
      case 'medium':
      default:
        return DEFAULT_CHUNK_SIZE // 1MB for medium connections
    }
  }

  /**
   * Update transfer rate and adjust chunk size dynamically
   */
  public updateTransferRate(
    chunkSize: number,
    timeTaken: number
  ): {
    newChunkSize: number
    transferSpeed: number
    connectionQuality: ConnectionQuality['type']
  } {
    const bytesPerMs = chunkSize / timeTaken
    const mbps = (bytesPerMs * 1000) / (1024 * 1024)

    // Keep last 5 transfer rates for averaging
    this.transferRates.push(mbps)
    if (this.transferRates.length > 5) this.transferRates.shift()

    // Calculate average transfer rate
    const avgMbps =
      this.transferRates.reduce((sum, rate) => sum + rate, 0) / this.transferRates.length

    // Dynamically adjust chunk size based on transfer rate
    if (avgMbps > 8) {
      // Very fast connection (>8 MB/s)
      this.consecutiveFastChunks++
      this.consecutiveSlowChunks = 0
      if (this.consecutiveFastChunks >= 3 && this.currentChunkSize < MAX_CHUNK_SIZE) {
        this.currentChunkSize = Math.min(this.currentChunkSize * 1.5, MAX_CHUNK_SIZE)
        this.connectionQuality = 'fast'
        this.consecutiveFastChunks = 0
      }
    } else if (avgMbps < 1) {
      // Slow connection (<1 MB/s)
      this.consecutiveSlowChunks++
      this.consecutiveFastChunks = 0
      if (this.consecutiveSlowChunks >= 2 && this.currentChunkSize > MIN_CHUNK_SIZE) {
        this.currentChunkSize = Math.max(this.currentChunkSize / 1.5, MIN_CHUNK_SIZE)
        this.connectionQuality = 'slow'
        this.consecutiveSlowChunks = 0
      }
    } else {
      // Medium connection, use default chunk size
      this.connectionQuality = 'medium'
      this.currentChunkSize = DEFAULT_CHUNK_SIZE
      this.consecutiveFastChunks = 0
      this.consecutiveSlowChunks = 0
    }

    return {
      newChunkSize: this.currentChunkSize,
      transferSpeed: mbps,
      connectionQuality: this.connectionQuality,
    }
  }

  /**
   * Calculate optimal delay between chunks based on connection quality and file size
   */
  public getOptimalDelay(fileSize: number, connectionQuality: ConnectionQuality['type']): number {
    if (fileSize > 100 * 1024 * 1024) {
      // Files > 100MB
      return connectionQuality === 'slow' ? 50 : 10
    }
    // Smaller files
    return connectionQuality === 'slow' ? 25 : 0
  }

  /**
   * Process chunk for sending with optional compression
   */
  public processChunkForSending(
    chunkData: Uint8Array,
    chunkIndex: number,
    filename: string,
    mimeType: string
  ): ChunkData {
    const shouldCompr = shouldCompress(filename, mimeType, chunkData.length)
    debugLog(
      `[COMPRESSION] Processing chunk ${chunkIndex} for ${filename} (${mimeType}): compression=${this.compressionEnabled}, shouldCompress=${shouldCompr}`
    )

    if (!this.compressionEnabled || !shouldCompr) {
      debugLog(
        `[COMPRESSION] Skipping compression for chunk ${chunkIndex}: enabled=${this.compressionEnabled}, should=${shouldCompr}`
      )
      return {
        data: chunkData,
        index: chunkIndex,
        isCompressed: false,
        originalSize: chunkData.length,
      }
    }

    // Use user-configured compression level instead of automatic level
    const compressionResult = compressDataSync(chunkData, {
      level: this.userCompressionLevel,
      enableCompression: true,
    })

    return {
      data: compressionResult.compressedData,
      index: chunkIndex,
      isCompressed: compressionResult.isCompressed,
      originalSize: compressionResult.originalSize,
      compressionRatio: compressionResult.compressionRatio,
    }
  }

  /**
   * Process received chunk with decompression
   */
  public processReceivedChunk(chunkData: ChunkData): Uint8Array {
    if (!chunkData.isCompressed) {
      return chunkData.data
    }

    try {
      return decompressDataSync(chunkData.data, true)
    } catch (error) {
      logger.error('Failed to decompress chunk:', error)
      throw new Error(`Chunk decompression failed: ${error}`)
    }
  }

  /**
   * Enable or disable compression
   */
  public setCompressionEnabled(enabled: boolean): void {
    debugLog(`[COMPRESSION] ChunkProcessor compression ${enabled ? 'ENABLED' : 'DISABLED'}`)
    this.compressionEnabled = enabled
  }

  /**
   * Set user-configured compression level
   */
  public setCompressionLevel(level: number): void {
    this.userCompressionLevel = Math.max(0, Math.min(9, level))
    debugLog(`[COMPRESSION] ChunkProcessor compression level set to: ${this.userCompressionLevel}`)
  }

  /**
   * Get current compression settings
   */
  public getCompressionInfo(): {
    enabled: boolean
    level: number
    connectionQuality: ConnectionQuality['type']
  } {
    return {
      enabled: this.compressionEnabled,
      level: this.userCompressionLevel,
      connectionQuality: this.connectionQuality,
    }
  }

  /**
   * Reset processor state for new transfer
   */
  public reset(): void {
    this.transferRates = []
    this.consecutiveSlowChunks = 0
    this.consecutiveFastChunks = 0
    this.currentChunkSize = DEFAULT_CHUNK_SIZE
    this.connectionQuality = 'medium'
  }
}

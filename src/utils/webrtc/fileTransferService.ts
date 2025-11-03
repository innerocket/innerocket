import Sqlds from 'sqids'
import type { FileMetadata } from '../../types'
import { calculateChecksum } from '../checksum'
import { createFileChunkWorker } from '../workerLoader'
import { ChunkProcessor, type ChunkData } from './chunkProcessor'
import type { PeerData } from './connectionManager'
import type { ConnectionQuality, FileTransferState, WebRTCCallbacks } from './types'
import { type CompressionResult } from '../compressionUtils'
import { debugLog, logger } from '../logger'

const sqlds = new Sqlds()
const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024 // 100MB

export class FileTransferService {
  private chunkProcessor: ChunkProcessor
  private activeTransfers: Map<string, FileTransferState> = new Map()
  private callbacks: Partial<WebRTCCallbacks> = {}
  private compressionStats: Map<string, CompressionResult[]> = new Map()

  constructor() {
    this.chunkProcessor = new ChunkProcessor()
  }

  public setCallbacks(callbacks: Partial<WebRTCCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  public setCompressionEnabled(enabled: boolean): void {
    debugLog(`[COMPRESSION] Setting compression ${enabled ? 'ENABLED' : 'DISABLED'}`)
    this.chunkProcessor.setCompressionEnabled(enabled)
  }

  public setCompressionLevel(level: number): void {
    debugLog(`[COMPRESSION] Setting compression level: ${level}`)
    this.chunkProcessor.setCompressionLevel(level)
  }

  public getCompressionInfo() {
    return this.chunkProcessor.getCompressionInfo()
  }

  public getCompressionStats(transferId: string): CompressionResult[] {
    return this.compressionStats.get(transferId) || []
  }

  public getTotalCompressionSavings(transferId: string): {
    savedBytes: number
    savedPercentage: number
  } {
    const stats = this.compressionStats.get(transferId) || []
    const totalOriginal = stats.reduce((sum, stat) => sum + stat.originalSize, 0)
    const totalCompressed = stats.reduce((sum, stat) => sum + stat.compressedSize, 0)

    if (totalOriginal === 0) {
      return { savedBytes: 0, savedPercentage: 0 }
    }

    const savedBytes = totalOriginal - totalCompressed
    const savedPercentage = (savedBytes / totalOriginal) * 100

    return {
      savedBytes,
      savedPercentage: Math.round(savedPercentage * 100) / 100,
    }
  }

  public async createFileRequest(file: File): Promise<FileMetadata | null> {
    try {
      const checksum = await calculateChecksum(file)

      const metadata: FileMetadata = {
        id: sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)]),
        name: file.name,
        size: file.size,
        type: file.type,
        checksum: checksum,
      }

      return metadata
    } catch (error) {
      logger.error('Error calculating checksum:', error)
      return null
    }
  }

  public sendFile(
    sendDataFn: (data: PeerData) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): void {
    if (this.supportsFileStreaming(file)) {
      void this.sendFileStreaming(sendDataFn, file, metadata, peerId)
      return
    }

    // Use web worker for large files as a fallback when streaming isn't available
    if (file.size > LARGE_FILE_THRESHOLD && typeof Worker !== 'undefined') {
      this.sendFileWithWorker(sendDataFn, file, metadata, peerId)
      return
    }

    this.sendFileLegacy(sendDataFn, file, metadata, peerId)
  }

  private supportsFileStreaming(file: File): boolean {
    const hasStream =
      typeof (file as File & { stream?: () => ReadableStream<Uint8Array> }).stream === 'function'
    return (
      typeof ReadableStream !== 'undefined' && typeof TransformStream !== 'undefined' && hasStream
    )
  }

  private createChunkingTransform(chunkSizeRef: {
    value: number
  }): TransformStream<Uint8Array, Uint8Array> {
    let bufferedBytes = 0
    const buffers: Uint8Array[] = []

    const consume = (size: number): Uint8Array => {
      const output = new Uint8Array(size)
      let offset = 0

      while (offset < size && buffers.length > 0) {
        const current = buffers[0]
        const remaining = size - offset

        if (current.byteLength <= remaining) {
          output.set(current, offset)
          offset += current.byteLength
          buffers.shift()
        } else {
          output.set(current.subarray(0, remaining), offset)
          buffers[0] = current.subarray(remaining)
          offset += remaining
        }
      }

      bufferedBytes -= size
      return output
    }

    return new TransformStream<Uint8Array, Uint8Array>({
      transform: (chunk, controller) => {
        if (!chunk || chunk.byteLength === 0) {
          return
        }

        buffers.push(chunk)
        bufferedBytes += chunk.byteLength

        const targetSize = Math.max(1, Math.floor(chunkSizeRef.value))
        while (bufferedBytes >= targetSize) {
          controller.enqueue(consume(targetSize))
        }
      },
      flush: controller => {
        while (bufferedBytes > 0) {
          const remainingSize = Math.min(bufferedBytes, Math.max(1, Math.floor(chunkSizeRef.value)))
          controller.enqueue(consume(remainingSize))
        }
      },
    })
  }

  private createCompressionTransform(
    file: File,
    chunkIndexRef: { value: number }
  ): TransformStream<Uint8Array, ChunkData> {
    return new TransformStream<Uint8Array, ChunkData>({
      transform: (chunk, controller) => {
        const processedChunk = this.chunkProcessor.processChunkForSending(
          chunk,
          chunkIndexRef.value,
          file.name,
          file.type
        )

        chunkIndexRef.value += 1
        controller.enqueue(processedChunk)
      },
    })
  }

  private toArrayBuffer(view: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(view.byteLength)
    new Uint8Array(buffer).set(view)
    return buffer
  }

  private async sendFileStreaming(
    sendDataFn: (data: PeerData) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): Promise<void> {
    this.chunkProcessor.reset()

    let connectionQuality: ConnectionQuality['type'] = 'medium'
    let currentTransferSpeed = 0
    const chunkSizeRef = {
      value: this.chunkProcessor.getOptimalChunkSize(file.size, connectionQuality),
    }
    const chunkIndexRef = { value: 0 }
    const chunkStream = (file.stream() as ReadableStream<Uint8Array>)
      .pipeThrough(this.createChunkingTransform(chunkSizeRef))
      .pipeThrough(this.createCompressionTransform(file, chunkIndexRef))

    // Track this transfer
    this.activeTransfers.set(metadata.id, {
      metadata,
      totalSize: file.size,
      transferredBytes: 0,
      startTime: Date.now(),
      isActive: true,
    })

    const reader = chunkStream.getReader()
    const usePerformanceNow =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
    let previousSendTime: number | null = null
    let transferredBytes = 0
    let wasCancelled = false

    try {
      // Process stream sequentially
      while (true) {
        const { value: processedChunk, done } = await reader.read()
        if (done) {
          break
        }

        if (!processedChunk) {
          continue
        }

        if (!this.activeTransfers.has(metadata.id)) {
          wasCancelled = true
          break
        }

        const now = usePerformanceNow ? performance.now() : Date.now()
        const nextTransferredBytes = transferredBytes + processedChunk.originalSize
        const progress = Math.min(100, Math.floor((nextTransferredBytes / file.size) * 100))

        const chunkArrayBuffer = this.toArrayBuffer(processedChunk.data)

        sendDataFn({
          type: 'file-chunk',
          chunk: chunkArrayBuffer,
          metadata,
          progress,
          chunkSize: processedChunk.data.length,
          transferSpeed: currentTransferSpeed,
          chunkIndex: processedChunk.index,
          isCompressed: processedChunk.isCompressed,
          originalChunkSize: processedChunk.originalSize,
          compressionRatio: processedChunk.compressionRatio,
        })

        this.callbacks.onFileChunk?.(
          peerId,
          chunkArrayBuffer,
          metadata,
          progress,
          processedChunk.data.length,
          currentTransferSpeed,
          processedChunk.index,
          processedChunk.isCompressed,
          processedChunk.originalSize,
          processedChunk.compressionRatio
        )

        if (!this.compressionStats.has(metadata.id)) {
          this.compressionStats.set(metadata.id, [])
        }

        if (processedChunk.isCompressed && processedChunk.compressionRatio) {
          this.compressionStats.get(metadata.id)!.push({
            compressedData: processedChunk.data,
            originalSize: processedChunk.originalSize,
            compressedSize: processedChunk.data.length,
            compressionRatio: processedChunk.compressionRatio,
            isCompressed: true,
          })
        }

        if (previousSendTime !== null) {
          const timeTaken = now - previousSendTime
          if (timeTaken > 0) {
            const transferData = this.chunkProcessor.updateTransferRate(
              processedChunk.data.length,
              timeTaken
            )
            chunkSizeRef.value = transferData.newChunkSize
            currentTransferSpeed = transferData.transferSpeed
            connectionQuality = transferData.connectionQuality
          }
        }

        previousSendTime = now
        transferredBytes = nextTransferredBytes

        const nextChunkDelay = this.chunkProcessor.getOptimalDelay(file.size, connectionQuality)
        if (nextChunkDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, nextChunkDelay))
        }
      }

      if (!wasCancelled) {
        const compressionSavings = this.getTotalCompressionSavings(metadata.id)
        sendDataFn({
          type: 'file-complete',
          metadata,
          progress: 100,
          compressionSavings,
        })
      }
    } catch (error) {
      logger.error('Error streaming file:', error)
    } finally {
      reader.releaseLock()
      this.activeTransfers.delete(metadata.id)
      this.compressionStats.delete(metadata.id)
    }
  }

  private sendFileLegacy(
    sendDataFn: (data: PeerData) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): void {
    this.chunkProcessor.reset()
    let chunkSize = this.chunkProcessor.getOptimalChunkSize(file.size, 'medium')
    let connectionQuality: ConnectionQuality['type'] = 'medium'

    const reader = new FileReader()
    let offset = 0
    let chunkIndex = 0
    let lastSendTime = 0
    let currentTransferSpeed = 0

    const sendChunk = () => {
      if (offset >= file.size) {
        // File transfer complete - always send 100% progress with compression stats
        const compressionSavings = this.getTotalCompressionSavings(metadata.id)
        sendDataFn({
          type: 'file-complete',
          metadata,
          progress: 100,
          compressionSavings,
        })
        this.activeTransfers.delete(metadata.id)
        this.compressionStats.delete(metadata.id) // Cleanup stats
        return
      }

      const slice = file.slice(offset, offset + chunkSize)
      reader.readAsArrayBuffer(slice)
    }

    reader.onload = e => {
      if (!e.target) return

      const now = Date.now()
      const rawChunk = e.target.result
      if (!(rawChunk instanceof ArrayBuffer)) return

      // Process chunk with compression
      const processedChunk = this.chunkProcessor.processChunkForSending(
        new Uint8Array(rawChunk),
        chunkIndex,
        file.name,
        file.type
      )

      // Log compression result
      if (processedChunk.isCompressed) {
        const savings = (
          ((processedChunk.originalSize - processedChunk.data.length) /
            processedChunk.originalSize) *
          100
        ).toFixed(1)
        debugLog(
          `[COMPRESSION] Chunk ${chunkIndex}: ${processedChunk.originalSize} bytes → ${processedChunk.data.length} bytes (${savings}% saved)`
        )
      } else {
        debugLog(
          `[COMPRESSION] Chunk ${chunkIndex}: No compression applied (${processedChunk.originalSize} bytes)`
        )
      }

      // Track compression stats
      if (!this.compressionStats.has(metadata.id)) {
        this.compressionStats.set(metadata.id, [])
      }

      if (processedChunk.isCompressed && processedChunk.compressionRatio) {
        this.compressionStats.get(metadata.id)!.push({
          compressedData: processedChunk.data,
          originalSize: processedChunk.originalSize,
          compressedSize: processedChunk.data.length,
          compressionRatio: processedChunk.compressionRatio,
          isCompressed: true,
        })
      }

      const progress = Math.min(100, Math.floor(((offset + rawChunk.byteLength) / file.size) * 100))

      // Convert Uint8Array to ArrayBuffer properly
      const chunkArrayBuffer = new ArrayBuffer(processedChunk.data.length)
      const chunkView = new Uint8Array(chunkArrayBuffer)
      chunkView.set(processedChunk.data)

      // Send the processed chunk
      sendDataFn({
        type: 'file-chunk',
        chunk: chunkArrayBuffer,
        metadata,
        progress,
        chunkSize: processedChunk.data.length,
        transferSpeed: currentTransferSpeed,
        chunkIndex,
        isCompressed: processedChunk.isCompressed,
        originalChunkSize: processedChunk.originalSize,
        compressionRatio: processedChunk.compressionRatio,
      })

      // Update sender's progress too via event
      this.callbacks.onFileChunk?.(
        peerId,
        chunkArrayBuffer,
        metadata,
        progress,
        processedChunk.data.length,
        currentTransferSpeed,
        chunkIndex
      )

      // Measure transfer rate if not the first chunk
      if (lastSendTime > 0 && processedChunk.data) {
        const timeTaken = now - lastSendTime // ms
        const transferData = this.chunkProcessor.updateTransferRate(
          processedChunk.data.length,
          timeTaken
        )

        chunkSize = transferData.newChunkSize
        currentTransferSpeed = transferData.transferSpeed
        connectionQuality = transferData.connectionQuality
      }

      // Update offset for next chunk (based on original chunk size)
      offset += rawChunk.byteLength
      chunkIndex++
      lastSendTime = now

      // Optimize the delay between chunks based on transfer rate
      const nextChunkDelay = this.chunkProcessor.getOptimalDelay(file.size, connectionQuality)

      setTimeout(sendChunk, nextChunkDelay)
    }

    reader.onerror = error => {
      logger.error('Error reading file:', error)
      this.activeTransfers.delete(metadata.id)
    }

    // Track this transfer
    this.activeTransfers.set(metadata.id, {
      metadata,
      totalSize: file.size,
      transferredBytes: 0,
      startTime: Date.now(),
      isActive: true,
    })

    sendChunk()
  }

  private sendFileWithWorker(
    sendDataFn: (data: PeerData) => boolean,
    file: File,
    metadata: FileMetadata,
    peerId: string
  ): void {
    try {
      const worker = createFileChunkWorker()
      let isCancelled = false

      const cleanup = () => {
        isCancelled = true
        worker.terminate()
        this.activeTransfers.delete(metadata.id)
        logger.info(`Worker for transfer ${metadata.id} terminated.`)
      }

      // Track this transfer
      this.activeTransfers.set(metadata.id, {
        metadata,
        totalSize: file.size,
        transferredBytes: 0,
        startTime: Date.now(),
        isActive: true,
      })

      const processFile = async () => {
        let offset = 0
        const chunkSize = this.chunkProcessor.getOptimalChunkSize(file.size, 'medium')

        while (offset < file.size && !isCancelled) {
          const chunkDataPromise = new Promise<{
            chunk: ArrayBuffer
            nextOffset: number
            progress: number
            metadata: { index: number }
          }>((resolve, reject) => {
            const messageListener = (e: MessageEvent) => {
              const data = e.data
              if (data.type === 'chunk' && data.offset === offset) {
                worker.removeEventListener('message', messageListener)
                resolve(data)
              } else if (data.type === 'error') {
                worker.removeEventListener('message', messageListener)
                reject(new Error(data.error))
              }
            }

            worker.addEventListener('message', messageListener)

            worker.postMessage({
              action: 'process',
              file,
              chunkSize,
              offset,
            })
          })

          try {
            const { chunk, nextOffset, progress, metadata: chunkMeta } = await chunkDataPromise

            if (isCancelled) break

            sendDataFn({
              type: 'file-chunk',
              chunk,
              metadata,
              progress,
              chunkSize: chunk.byteLength,
              chunkIndex: chunkMeta.index,
            })

            // Update sender's progress too via event
            this.callbacks.onFileChunk?.(
              peerId,
              chunk,
              metadata,
              progress,
              chunk.byteLength,
              0, // Transfer speed not available in worker mode
              chunkMeta.index
            )

            offset = nextOffset
          } catch (error) {
            logger.error('Error processing chunk in worker:', error)
            cleanup()
            break
          }
        }

        if (!isCancelled) {
          // Send completion stats
          const compressionSavings = this.getTotalCompressionSavings(metadata.id)
          sendDataFn({
            type: 'file-complete',
            metadata,
            progress: 100,
            compressionSavings,
          })
          cleanup()
        }
      }

      processFile()
    } catch (error) {
      logger.error('Failed to create worker, falling back to standard method:', error)
      this.sendFileLegacy(sendDataFn, file, metadata, peerId)
    }
  }

  public getActiveTransfers(): FileTransferState[] {
    return Array.from(this.activeTransfers.values())
  }

  public cancelTransfer(transferId: string): void {
    const transfer = this.activeTransfers.get(transferId)
    if (transfer) {
      transfer.isActive = false
      this.activeTransfers.delete(transferId)
      this.compressionStats.delete(transferId) // Cleanup stats
    }
  }

  public processReceivedChunk(chunkData: ChunkData): Uint8Array {
    return this.chunkProcessor.processReceivedChunk(chunkData)
  }
}

import { createSignal, createEffect, createMemo, on, onCleanup } from 'solid-js'
import Sqlds from 'sqids'
import { WebRTCService } from '../utils/webrtc'
import { usePeer } from '../contexts/PeerContext'
import { verifyChecksum } from '../utils/checksum'
import { createSHA256 } from 'hash-wasm'
import { FileStorageService } from '../services/fileStorageService'
import { createProgressAnimation, getFileTypeFromName } from '../utils/fileTransferUtils'
import type { FileTransfer, FileTransferRequest, FileMetadata } from '../types'
import { debugLog, debugError, logger } from '../utils/logger'
import { ChunkBufferPool } from '../utils/webrtc/chunkPool'

const sqlds = new Sqlds()

const PROGRESSIVE_DOWNLOAD_THRESHOLD = 50 * 1024 * 1024 // 50MB
const chunkPool = new ChunkBufferPool({ maxPerBucket: 16, minBucketSize: 128 * 1024 })

interface ReceiverState {
  metadata: FileMetadata
  useProgressive: boolean
  chunks?: Map<number, Uint8Array>
  receivedBytes: number
  seenIndices: Set<number>
  hasherReady: Promise<void>
  hasher?: Awaited<ReturnType<typeof createSHA256>>
  pendingWrite: Promise<void>
  nextHashIndex: number
  pendingHashChunks?: Map<number, Uint8Array>
  chunkWriter?: WritableStreamDefaultWriter<IncomingChunkPayload>
  processingTask?: Promise<void>
  streamError?: unknown
}

interface IncomingChunkPayload {
  arrayBuffer: ArrayBuffer
  chunkIndex: number
  progress: number
  chunkSize?: number
  transferSpeed?: number
  isCompressed?: boolean
  originalChunkSize?: number
  compressionRatio?: number
}

interface ProcessedIncomingChunk extends IncomingChunkPayload {
  view: Uint8Array
}

interface ChunkStreamError extends Error {
  chunkIndex?: number
}

interface UseWebRTCFileTransferProps {
  addTransfer: (transfer: FileTransfer) => void
  updateTransfer: (transferId: string, updates: Partial<FileTransfer>) => void
  updateTransferProgress: (
    transferId: string,
    progress: number,
    status?: FileTransfer['status'],
    transferSpeed?: number,
    chunkSize?: number
  ) => void
  addReceivedFile: (fileId: string, blob: Blob) => void
  removeTransfer: (transferId: string) => void
  setConnectedPeers: (peers: string[]) => void
  setIsTransferring: (isTransferring: boolean) => void
  autoAcceptFiles?: () => boolean
  isTrustedPeer?: () => (peerId: string) => boolean
  isFileSizeAllowed?: () => (fileSize: number) => boolean
}

export function useWebRTCFileTransfer({
  addTransfer,
  updateTransfer,
  updateTransferProgress,
  addReceivedFile,
  removeTransfer,
  setConnectedPeers,
  setIsTransferring,
  autoAcceptFiles,
  isTrustedPeer,
  isFileSizeAllowed,
}: UseWebRTCFileTransferProps) {
  const { peerId, addPrefixToId, removePrefixFromId } = usePeer()
  const [connectedPeersLocal, setConnectedPeersLocal] = createSignal<string[]>([])
  const [incomingRequests, setIncomingRequests] = createSignal<FileTransferRequest[]>([])
  const pendingOutgoing = new Map<string, { peerId: string; file: File; metadata: FileMetadata }>()

  const webRTCService = createMemo(
    () => new WebRTCService(peerId(), addPrefixToId, removePrefixFromId)
  )
  const fileStorageService = new FileStorageService()
  const receiverStates = new Map<string, ReceiverState>()

  const initializeReceiverState = (metadata: FileMetadata): ReceiverState => {
    const existing = receiverStates.get(metadata.id)
    if (existing) {
      return existing
    }

    const useProgressive = metadata.size >= PROGRESSIVE_DOWNLOAD_THRESHOLD
    const state: ReceiverState = {
      metadata,
      useProgressive,
      chunks: useProgressive ? undefined : new Map<number, Uint8Array>(),
      receivedBytes: 0,
      seenIndices: new Set<number>(),
      hasherReady: Promise.resolve(),
      pendingWrite: Promise.resolve(),
      nextHashIndex: 0,
      pendingHashChunks: useProgressive ? new Map<number, Uint8Array>() : undefined,
    }

    if (useProgressive) {
      state.hasherReady = (async () => {
        try {
          const hasher = await createSHA256()
          hasher.init()
          state.hasher = hasher
        } catch (error) {
          logger.error('Failed to initialize checksum hasher:', error)
          throw error
        }

        try {
          await fileStorageService.prepareChunkStorage(metadata.id)
        } catch (error) {
          logger.error('Failed to prepare chunk storage:', error)
          throw error
        }
      })()
    }

    receiverStates.set(metadata.id, state)
    return state
  }

  const cleanupReceiverState = async (
    fileId: string,
    options?: { preserveChunks?: boolean; abortStream?: boolean }
  ): Promise<void> => {
    const state = receiverStates.get(fileId)
    if (!state) return

    if (!state.useProgressive && state.chunks) {
      state.chunks.forEach(chunk => {
        chunkPool.release(chunk)
      })
    }

    state.pendingHashChunks?.clear()

    try {
      if (options?.abortStream) {
        await state.chunkWriter?.abort?.('cleanup')
      } else if (state.chunkWriter) {
        await state.chunkWriter.close()
      }
    } catch (error) {
      logger.error('Failed to close chunk stream during cleanup:', error)
    }

    if (state.processingTask) {
      try {
        await state.processingTask
      } catch (error) {
        logger.error('Chunk processing did not complete cleanly:', error)
      }
    }

    if (state.useProgressive && !options?.preserveChunks) {
      try {
        await fileStorageService.prepareChunkStorage(fileId)
      } catch (error) {
        logger.error('Failed to clear chunk storage:', error)
      }
    }

    receiverStates.delete(fileId)
  }

  const cloneToArrayBuffer = (view: Uint8Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(view.byteLength)
    new Uint8Array(buffer).set(view)
    return buffer
  }

  const loadCompletedFiles = async () => {
    try {
      const files = await fileStorageService.getAllFiles()

      files.forEach(file => {
        if (!file.isChunked && file.blob) {
          addReceivedFile(file.id, file.blob)
        }

        addTransfer({
          id: file.id,
          fileName: file.fileName,
          fileSize: file.isChunked ? file.totalSize || 0 : file.blob?.size || 0,
          fileType: file.fileType || getFileTypeFromName(file.fileName),
          sender: 'unknown',
          receiver: webRTCService().getMyPeerId(),
          progress: 100,
          status: 'completed',
          createdAt: file.timestamp || Date.now(),
          checksum: file.checksum,
        })
      })
    } catch (error) {
      logger.error('Error loading completed files:', error)
    }
  }

  createEffect(
    on(webRTCService, service => {
      service.setOnPeerConnected(peer => {
        setConnectedPeersLocal(prev => {
          const newPeers = [...prev, peer.id]
          setConnectedPeers(newPeers)
          return newPeers
        })
      })

      service.setOnPeerDisconnected(peerId => {
        setConnectedPeersLocal(prev => {
          const newPeers = prev.filter(id => id !== peerId)
          setConnectedPeers(newPeers)
          return newPeers
        })
      })

      const processIncomingChunks = (
        state: ReceiverState,
        stream: ReadableStream<ProcessedIncomingChunk>
      ): Promise<void> => {
        const reader = stream.getReader()

        const run = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              if (!value) continue

              const { view, chunkIndex, progress, transferSpeed, chunkSize } = value

              try {
                if (state.useProgressive) {
                  await state.hasherReady
                  if (!state.pendingHashChunks) {
                    state.pendingHashChunks = new Map<number, Uint8Array>()
                  }

                  const chunkForHash = view.slice()
                  state.pendingHashChunks.set(chunkIndex, chunkForHash)

                  while (state.pendingHashChunks.has(state.nextHashIndex)) {
                    const nextChunk = state.pendingHashChunks.get(state.nextHashIndex)!
                    state.pendingHashChunks.delete(state.nextHashIndex)
                    state.hasher?.update(nextChunk)
                    state.nextHashIndex++
                  }

                  state.pendingWrite = state.pendingWrite
                    .then(() =>
                      fileStorageService.appendChunkToFile(state.metadata.id, chunkIndex, view)
                    )
                    .catch(error => {
                      throw error
                    })
                  await state.pendingWrite
                } else if (state.chunks) {
                  const pooledChunk = chunkPool.acquire(view.byteLength)
                  pooledChunk.set(view)
                  state.chunks.set(chunkIndex, pooledChunk)
                }
              } catch (error) {
                const enhancedError = error instanceof Error ? error : new Error(String(error))
                logger.error(
                  `Failed to persist chunk ${chunkIndex} for ${state.metadata.name}:`,
                  enhancedError
                )
                throw enhancedError
              }

              state.receivedBytes += view.byteLength
              state.seenIndices.add(chunkIndex)
              updateTransferProgress(
                state.metadata.id,
                progress,
                'transferring',
                transferSpeed,
                chunkSize ?? view.byteLength
              )
            }
          } finally {
            reader.releaseLock()
          }
        }

        return run()
      }

      const startChunkProcessing = (
        state: ReceiverState
      ): WritableStreamDefaultWriter<IncomingChunkPayload> => {
        if (state.chunkWriter) {
          return state.chunkWriter
        }

        state.streamError = undefined
        const chunkStream = new TransformStream<IncomingChunkPayload, IncomingChunkPayload>()
        const decompressedStream = chunkStream.readable.pipeThrough(
          new TransformStream<IncomingChunkPayload, ProcessedIncomingChunk>({
            transform: (incoming, controller) => {
              const { chunkIndex, isCompressed, originalChunkSize, compressionRatio } = incoming
              try {
                let view: Uint8Array
                if (isCompressed) {
                  const compressedView = new Uint8Array(incoming.arrayBuffer)
                  const decompressed = service.processReceivedChunk({
                    data: compressedView,
                    index: chunkIndex,
                    isCompressed: true,
                    originalSize: originalChunkSize || compressedView.byteLength,
                    compressionRatio,
                  })
                  const decompressedCopy = decompressed.slice()
                  view = decompressedCopy
                  debugLog(
                    `[COMPRESSION] Decompressed chunk ${chunkIndex}: ${incoming.arrayBuffer.byteLength} bytes → ${view.byteLength} bytes`
                  )
                } else {
                  view = new Uint8Array(incoming.arrayBuffer)
                }

                controller.enqueue({ ...incoming, view })
              } catch (error) {
                debugError(`Failed to decompress chunk ${chunkIndex}:`, error)
                const enhancedError = error instanceof Error ? error : new Error(String(error))
                ;(enhancedError as ChunkStreamError).chunkIndex = chunkIndex
                controller.error(enhancedError)
              }
            },
          })
        )

        const processingTask = processIncomingChunks(state, decompressedStream)
        state.processingTask = processingTask
        processingTask.catch(error => {
          state.streamError = error
        })

        state.chunkWriter = chunkStream.writable.getWriter()
        return state.chunkWriter
      }

      service.setOnFileTransferRequest(request => {
        const { metadata, from } = request

        addTransfer({
          id: metadata.id,
          fileName: metadata.name,
          fileSize: metadata.size,
          fileType: metadata.type,
          sender: from.id,
          receiver: service.getMyPeerId(),
          progress: 0,
          status: 'pending',
          createdAt: Date.now(),
          checksum: metadata.checksum,
        })

        initializeReceiverState(metadata)

        // Check all auto-accept conditions
        const isAutoAcceptEnabled = autoAcceptFiles?.()
        const isPeerTrusted = !isTrustedPeer || isTrustedPeer()!(from.id)
        const isFileSizeOk = !isFileSizeAllowed || isFileSizeAllowed()!(metadata.size)

        const shouldAutoAccept = isAutoAcceptEnabled && isPeerTrusted && isFileSizeOk

        if (shouldAutoAccept) {
          const trustStatus = isTrustedPeer
            ? isTrustedPeer()!(from.id)
              ? 'trusted'
              : 'untrusted'
            : 'no-whitelist'
          const sizeStatus = isFileSizeAllowed
            ? isFileSizeAllowed()!(metadata.size)
              ? 'allowed'
              : 'too-large'
            : 'no-limit'
          debugLog(
            `[AUTO-ACCEPT] Automatically accepting file: ${metadata.name} from ${from.id} (peer: ${trustStatus}, size: ${sizeStatus})`
          )
          // Auto-accept the file transfer
          setTimeout(() => {
            service.acceptFileTransfer(from.id, metadata)
            updateTransfer(metadata.id, { status: 'transferring', progress: 0 })
          }, 100) // Small delay to ensure UI updates
        } else {
          // Add to incoming requests for manual approval
          let reason = 'unknown'
          if (!isAutoAcceptEnabled) reason = 'auto-accept disabled'
          else if (!isPeerTrusted) reason = 'peer not trusted'
          else if (!isFileSizeOk) reason = 'file too large'

          debugLog(
            `[AUTO-ACCEPT] Manual approval required for ${metadata.name} from ${from.id}: ${reason}`
          )
          setIncomingRequests(prev => [...prev, request])
        }
      })

      service.setOnFileChunk(
        async (
          _peerId,
          chunk,
          metadata,
          progress,
          chunkSize,
          transferSpeed,
          chunkIndex,
          isCompressed,
          originalChunkSize,
          compressionRatio
        ) => {
          if (chunkIndex === undefined) {
            logger.error('Received a chunk without an index. Ignoring.')
            return
          }

          const state = initializeReceiverState(metadata)

          if (state.seenIndices.has(chunkIndex)) {
            return
          }

          const writer = startChunkProcessing(state)

          try {
            await writer.write({
              arrayBuffer: chunk,
              chunkIndex,
              progress,
              chunkSize,
              transferSpeed,
              isCompressed,
              originalChunkSize,
              compressionRatio,
            })
          } catch (error) {
            const streamError = (error || state.streamError) as ChunkStreamError | undefined
            if (streamError?.chunkIndex !== undefined) {
              debugError(`Stream processing failed for chunk ${streamError.chunkIndex}:`, error)
            } else {
              logger.error('Stream processing failed for incoming chunk:', error)
            }
            updateTransfer(metadata.id, { status: 'failed' })
            await cleanupReceiverState(metadata.id, { abortStream: true })
          }
        }
      )

      service.setOnFileTransferComplete(async (_, metadata) => {
        const state = receiverStates.get(metadata.id)

        if (!state) {
          logger.error(`No receiver state found for transfer ${metadata.id}`)
          updateTransfer(metadata.id, { status: 'failed' })
          return
        }

        try {
          if (state.chunkWriter) {
            try {
              await state.chunkWriter.close()
            } catch (error) {
              logger.error('Failed to close chunk writer on completion:', error)
            }
          }

          if (state.processingTask) {
            try {
              await state.processingTask
            } catch (error) {
              logger.error('Chunk processing did not finish successfully:', error)
              updateTransfer(metadata.id, { status: 'failed' })
              await cleanupReceiverState(metadata.id, { abortStream: true })
              return
            }
          }

          if (state.streamError) {
            logger.error(
              'Stream processing reported an error before completion:',
              state.streamError
            )
            updateTransfer(metadata.id, { status: 'failed' })
            await cleanupReceiverState(metadata.id, { abortStream: true })
            return
          }

          if (state.useProgressive) {
            await state.hasherReady
            await state.pendingWrite

            if (state.pendingHashChunks && state.pendingHashChunks.size > 0) {
              while (state.pendingHashChunks.has(state.nextHashIndex)) {
                const nextChunk = state.pendingHashChunks.get(state.nextHashIndex)!
                state.pendingHashChunks.delete(state.nextHashIndex)
                state.hasher?.update(nextChunk)
                state.nextHashIndex++
              }

              if (state.pendingHashChunks.size > 0) {
                logger.error(
                  `Hashing incomplete for ${metadata.name}: missing ${state.pendingHashChunks.size} chunks`
                )
                updateTransfer(metadata.id, { status: 'failed' })
                await cleanupReceiverState(metadata.id, { abortStream: true })
                return
              }
            }

            if (metadata.checksum && state.hasher) {
              updateTransfer(metadata.id, {
                progress: 100,
                status: 'verifying',
              })

              const digest = state.hasher.digest('hex')
              if (digest !== metadata.checksum) {
                logger.error(
                  `Checksum mismatch for ${metadata.name}: expected ${metadata.checksum}, got ${digest}`
                )
                updateTransfer(metadata.id, {
                  progress: 100,
                  status: 'integrity_error',
                })
                await cleanupReceiverState(metadata.id, { abortStream: true })
                return
              }
            }

            await fileStorageService.finalizeChunkedFileMetadata(
              metadata.id,
              metadata.name,
              metadata.size,
              metadata.type || 'application/octet-stream',
              metadata.checksum
            )

            updateTransfer(metadata.id, {
              progress: 100,
              status: 'completed',
              checksum: metadata.checksum,
            })
          } else if (state.chunks) {
            const sortedChunks = Array.from(state.chunks.entries()).sort(([a], [b]) => a - b)

            const blobParts = sortedChunks.map(([, chunkView]) => cloneToArrayBuffer(chunkView))

            const blob = new Blob(blobParts, {
              type: metadata.type || 'application/octet-stream',
            })

            if (blob.size !== metadata.size) {
              logger.error(`File size mismatch for ${metadata.name}`)
              updateTransfer(metadata.id, { status: 'failed' })
              await cleanupReceiverState(metadata.id, { abortStream: true })
              return
            }

            if (metadata.checksum) {
              updateTransfer(metadata.id, {
                progress: 100,
                status: 'verifying',
              })

              const isValid = await verifyChecksum(blob, metadata.checksum)
              if (!isValid) {
                updateTransfer(metadata.id, {
                  progress: 100,
                  status: 'integrity_error',
                })
                await cleanupReceiverState(metadata.id, { abortStream: true })
                return
              }
            }

            await fileStorageService.saveFile(metadata.id, blob, metadata.name, metadata.checksum)

            addReceivedFile(metadata.id, blob)

            updateTransfer(metadata.id, {
              progress: 100,
              status: 'completed',
              checksum: metadata.checksum,
            })
          }
        } catch (error) {
          logger.error('Error processing completed file transfer:', error)
          updateTransfer(metadata.id, { status: 'failed' })
          await cleanupReceiverState(metadata.id, { abortStream: true })
          return
        }

        await cleanupReceiverState(metadata.id, {
          preserveChunks: state.useProgressive,
        })
      })

      service.setOnFileTransferAccepted((peerId, metadata) => {
        const pending = pendingOutgoing.get(metadata.id)
        if (pending) {
          service.sendFile(peerId, pending.file, pending.metadata)
          updateTransfer(metadata.id, { status: 'transferring', progress: 0 })
          pendingOutgoing.delete(metadata.id)
        }
      })

      service.setOnFileTransferRejected((_, metadata) => {
        updateTransfer(metadata.id, { status: 'rejected' })
        pendingOutgoing.delete(metadata.id)
        void cleanupReceiverState(metadata.id, { abortStream: true })
      })

      onCleanup(() => {
        connectedPeersLocal().forEach(peerId => {
          service.disconnectFromPeer(peerId)
        })
        receiverStates.forEach((_, fileId) => {
          void cleanupReceiverState(fileId, { abortStream: true })
        })
        chunkPool.clear()
      })
    })
  )

  createEffect(() => {
    loadCompletedFiles()
  })

  const connectToPeer = (peerId: string) => {
    webRTCService().connectToPeer(peerId)
  }

  const disconnectFromPeer = (peerId: string) => {
    webRTCService().disconnectFromPeer(peerId)
  }

  const acceptRequest = (requestId: string) => {
    const req = incomingRequests().find(r => r.metadata.id === requestId)
    if (!req) return
    updateTransfer(requestId, { status: 'transferring', progress: 0 })
    webRTCService().acceptFileTransfer(req.from.id, req.metadata)
    setIncomingRequests(prev => prev.filter(r => r.metadata.id !== requestId))
  }

  const rejectRequest = (requestId: string) => {
    const req = incomingRequests().find(r => r.metadata.id === requestId)
    if (!req) return
    updateTransfer(requestId, { status: 'rejected' })
    webRTCService().rejectFileTransfer(req.from.id, req.metadata)
    setIncomingRequests(prev => prev.filter(r => r.metadata.id !== requestId))
  }

  const sendFile = async (peerId: string, file: File): Promise<string | null> => {
    setIsTransferring(true)
    try {
      const tempId = sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])

      addTransfer({
        id: tempId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sender: webRTCService().getMyPeerId(),
        receiver: peerId,
        progress: 0,
        status: 'preparing',
        createdAt: Date.now(),
      })

      const stopAnimation = createProgressAnimation(progress => {
        updateTransferProgress(tempId, progress)
      })

      const metadata = await webRTCService().sendFileRequest(peerId, file)

      if (!metadata) {
        stopAnimation()
        updateTransfer(tempId, { status: 'failed' })
        return null
      }

      stopAnimation()

      removeTransfer(tempId)
      addTransfer({
        id: metadata.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sender: webRTCService().getMyPeerId(),
        receiver: peerId,
        progress: 0,
        status: 'pending',
        createdAt: Date.now(),
        checksum: metadata.checksum,
      })

      pendingOutgoing.set(metadata.id, { peerId, file, metadata })

      return metadata.id
    } catch (error) {
      logger.error('Error sending file:', error)
      return null
    } finally {
      setIsTransferring(false)
    }
  }

  const sendFileToAllPeers = async (file: File): Promise<string[]> => {
    if (connectedPeersLocal().length === 0) {
      logger.warn('No connected peers to send file to')
      return []
    }

    const transferIds: string[] = []

    for (const peerId of connectedPeersLocal()) {
      const transferId = await sendFile(peerId, file)
      if (transferId) {
        transferIds.push(transferId)
      }
    }

    return transferIds
  }

  return {
    connectedPeers: connectedPeersLocal,
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    myPeerId: peerId,
    setWebRTCCompressionEnabled: (enabled: boolean) => {
      webRTCService().setCompressionEnabled(enabled)
      debugLog('Compression enabled:', enabled)
    },
    setWebRTCCompressionLevel: (level: number) => {
      webRTCService().setCompressionLevel(level)
      debugLog('Compression level:', level)
    },
    getCompressionStats: (transferId: string) => {
      return webRTCService().getCompressionStats(transferId)
    },
  }
}

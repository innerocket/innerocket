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
    options?: { preserveChunks?: boolean }
  ): Promise<void> => {
    const state = receiverStates.get(fileId)
    if (!state) return

    if (!state.useProgressive && state.chunks) {
      state.chunks.forEach(chunk => {
        chunkPool.release(chunk)
      })
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

          // If we already processed this index successfully, skip duplicates.
          if (state.seenIndices.has(chunkIndex)) {
            return
          }

          let processedChunk: ArrayBuffer = chunk
          if (isCompressed) {
            try {
              const compressedData = new Uint8Array(chunk)
              const decompressedData = webRTCService().processReceivedChunk({
                data: compressedData,
                index: chunkIndex,
                isCompressed: true,
                originalSize: originalChunkSize || 0,
                compressionRatio,
              })
              const decompressedCopy = decompressedData.slice()
              processedChunk = decompressedCopy.buffer
              debugLog(
                `[COMPRESSION] Decompressed chunk ${chunkIndex}: ${chunk.byteLength} bytes → ${processedChunk.byteLength} bytes`
              )
            } catch (error) {
              debugError(`Failed to decompress chunk ${chunkIndex}:`, error)
              await cleanupReceiverState(metadata.id)
              updateTransfer(metadata.id, { status: 'failed' })
              return
            }
          }

          const chunkView = new Uint8Array(processedChunk)
          state.receivedBytes += chunkView.byteLength

          if (state.useProgressive) {
            try {
              await state.hasherReady
              state.hasher?.update(chunkView)

              state.pendingWrite = state.pendingWrite
                .then(() =>
                  fileStorageService.appendChunkToFile(metadata.id, chunkIndex, chunkView)
                )
                .catch(error => {
                  throw error
                })
              await state.pendingWrite
            } catch (error) {
              logger.error(`Failed to persist chunk ${chunkIndex} for ${metadata.name}:`, error)
              await cleanupReceiverState(metadata.id)
              updateTransfer(metadata.id, { status: 'failed' })
              return
            }
          } else if (state.chunks) {
            const pooledChunk = chunkPool.acquire(chunkView.byteLength)
            pooledChunk.set(chunkView)
            state.chunks.set(chunkIndex, pooledChunk)
          }

          state.seenIndices.add(chunkIndex)
          updateTransferProgress(
            metadata.id,
            progress,
            'transferring',
            transferSpeed,
            chunkSize ?? chunkView.byteLength
          )
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
          if (state.useProgressive) {
            await state.hasherReady
            await state.pendingWrite

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
                await cleanupReceiverState(metadata.id)
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
              await cleanupReceiverState(metadata.id)
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
                await cleanupReceiverState(metadata.id)
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
          await cleanupReceiverState(metadata.id)
          return
        }

        await cleanupReceiverState(metadata.id, { preserveChunks: state.useProgressive })
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
        void cleanupReceiverState(metadata.id)
      })

      onCleanup(() => {
        connectedPeersLocal().forEach(peerId => {
          service.disconnectFromPeer(peerId)
        })
        receiverStates.forEach((_, fileId) => {
          void cleanupReceiverState(fileId)
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

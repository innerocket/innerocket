import { createSignal, createEffect, createMemo, on, onCleanup } from 'solid-js'
import Sqlds from 'sqids'
import { WebRTCService } from '../utils/webrtc'
import { usePeer } from '../contexts/PeerContext'
import { verifyChecksum } from '../utils/checksum'
import { FileStorageService } from '../services/fileStorageService'
import { createProgressAnimation, getFileTypeFromName } from '../utils/fileTransferUtils'
import type { FileTransfer, FileTransferRequest, FileMetadata } from '../types'
import { debugLog, debugError } from '../utils/debug'

const sqlds = new Sqlds()

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
}: UseWebRTCFileTransferProps) {
  const { peerId, addPrefixToId, removePrefixFromId } = usePeer()
  const [connectedPeersLocal, setConnectedPeersLocal] = createSignal<string[]>([])
  const [incomingRequests, setIncomingRequests] = createSignal<FileTransferRequest[]>([])
  const pendingOutgoing = new Map<string, { peerId: string; file: File; metadata: FileMetadata }>()

  const webRTCService = createMemo(
    () => new WebRTCService(peerId(), addPrefixToId, removePrefixFromId)
  )
  const fileStorageService = new FileStorageService()

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
      console.error('Error loading completed files:', error)
    }
  }

  createEffect(
    on(webRTCService, service => {
      const fileChunks = new Map<string, Map<number, ArrayBuffer>>()

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

        // Check if auto-accept is enabled and if peer is trusted (if whitelist is used)
        const shouldAutoAccept = autoAcceptFiles?.() && (
          !isTrustedPeer || // No trusted peer check enabled
          isTrustedPeer()!(from.id) // Peer is in trusted list
        )
        
        if (shouldAutoAccept) {
          const trustStatus = isTrustedPeer ? (isTrustedPeer()!(from.id) ? 'trusted' : 'untrusted') : 'no-whitelist'
          debugLog(`[AUTO-ACCEPT] Automatically accepting file: ${metadata.name} from ${from.id} (${trustStatus})`)
          // Auto-accept the file transfer
          setTimeout(() => {
            service.acceptFileTransfer(from.id, metadata)
            updateTransfer(metadata.id, { status: 'transferring', progress: 0 })
          }, 100) // Small delay to ensure UI updates
        } else {
          // Add to incoming requests for manual approval
          const reason = !autoAcceptFiles?.() ? 'auto-accept disabled' : 'peer not trusted'
          debugLog(`[AUTO-ACCEPT] Manual approval required for ${metadata.name} from ${from.id}: ${reason}`)
          setIncomingRequests(prev => [...prev, request])
        }
      })

      service.setOnFileChunk(
        (
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
            console.error('Received a chunk without an index. Ignoring.')
            return
          }

          if (!fileChunks.has(metadata.id)) {
            fileChunks.set(metadata.id, new Map<number, ArrayBuffer>())
          }

          const chunksMap = fileChunks.get(metadata.id)
          if (!chunksMap || chunksMap.has(chunkIndex)) {
            return // Ignore duplicates
          }

          // If chunk is compressed, decompress it before storing
          let processedChunk = chunk
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
              const newBuffer = new ArrayBuffer(decompressedData.length)
              const newView = new Uint8Array(newBuffer)
              newView.set(decompressedData)
              processedChunk = newBuffer
              debugLog(
                `[COMPRESSION] Decompressed chunk ${chunkIndex}: ${chunk.byteLength} bytes → ${processedChunk.byteLength} bytes`
              )
            } catch (error) {
              debugError(`Failed to decompress chunk ${chunkIndex}:`, error)
              return
            }
          }

          chunksMap.set(chunkIndex, processedChunk)

          updateTransferProgress(metadata.id, progress, 'transferring', transferSpeed, chunkSize)
        }
      )

      service.setOnFileTransferComplete(async (_, metadata) => {
        try {
          const chunksMap = fileChunks.get(metadata.id)
          if (!chunksMap) {
            throw new Error(`No chunks found for completed transfer ${metadata.id}`)
          }

          const sortedChunks = Array.from(chunksMap.entries())
            .sort(([indexA], [indexB]) => indexA - indexB)
            .map(([, chunkData]) => chunkData)

          const blob = new Blob(sortedChunks, {
            type: metadata.type || 'application/octet-stream',
          })

          fileChunks.delete(metadata.id)

          if (blob.size !== metadata.size) {
            console.error(`File size mismatch for ${metadata.name}`)
            updateTransfer(metadata.id, { status: 'failed' })
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
        } catch (error) {
          console.error('Error processing completed file transfer:', error)
          updateTransfer(metadata.id, { status: 'failed' })
          fileChunks.delete(metadata.id)
        }
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
      })

      onCleanup(() => {
        connectedPeersLocal().forEach(peerId => {
          service.disconnectFromPeer(peerId)
        })
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
      console.error('Error sending file:', error)
      return null
    } finally {
      setIsTransferring(false)
    }
  }

  const sendFileToAllPeers = async (file: File): Promise<string[]> => {
    if (connectedPeersLocal().length === 0) {
      console.warn('No connected peers to send file to')
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
    getCompressionStats: (transferId: string) => {
      return webRTCService().getCompressionStats(transferId)
    },
  }
}

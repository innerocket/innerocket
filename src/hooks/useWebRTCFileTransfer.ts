import { useEffect, useMemo, useState, useRef } from 'preact/hooks';
import { WebRTCService } from '../utils/webrtc';
import { usePeer } from '../contexts/PeerContext';
import { verifyChecksum } from '../utils/checksum';
import { FileStorageService } from '../services/fileStorageService';
import {
  createProgressAnimation,
  getFileTypeFromName,
} from '../utils/fileTransferUtils';
import type { FileTransfer, FileTransferRequest, FileMetadata } from '../types';

interface UseWebRTCFileTransferProps {
  addTransfer: (transfer: FileTransfer) => void;
  updateTransfer: (transferId: string, updates: Partial<FileTransfer>) => void;
  updateTransferProgress: (
    transferId: string,
    progress: number,
    status?: FileTransfer['status'],
    transferSpeed?: number,
    chunkSize?: number
  ) => void;
  addReceivedFile: (fileId: string, blob: Blob) => void;
  removeTransfer: (transferId: string) => void;
  setConnectedPeers: (peers: string[]) => void;
}

export function useWebRTCFileTransfer({
  addTransfer,
  updateTransfer,
  updateTransferProgress,
  addReceivedFile,
  removeTransfer,
  setConnectedPeers,
}: UseWebRTCFileTransferProps) {
  const { peerId } = usePeer();
  const [connectedPeers, setConnectedPeersLocal] = useState<string[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    FileTransferRequest[]
  >([]);
  const pendingOutgoing = useRef(
    new Map<string, { peerId: string; file: File; metadata: FileMetadata }>()
  );

  const webRTCService = useMemo(() => new WebRTCService(peerId), [peerId]);
  const fileStorageService = useMemo(() => new FileStorageService(), []);

  useEffect(() => {
    const fileChunks = new Map<string, Map<number, ArrayBuffer>>();

    // Set up WebRTC event handlers
    webRTCService.setOnPeerConnected((peer) => {
      setConnectedPeersLocal((prev) => {
        const newPeers = [...prev, peer.id];
        setConnectedPeers(newPeers);
        return newPeers;
      });
    });

    webRTCService.setOnPeerDisconnected((peerId) => {
      setConnectedPeersLocal((prev) => {
        const newPeers = prev.filter((id) => id !== peerId);
        setConnectedPeers(newPeers);
        return newPeers;
      });
    });

    webRTCService.setOnFileTransferRequest((request) => {
      const { metadata, from } = request;

      addTransfer({
        id: metadata.id,
        fileName: metadata.name,
        fileSize: metadata.size,
        fileType: metadata.type,
        sender: from.id,
        receiver: webRTCService.getMyPeerId(),
        progress: 0,
        status: 'pending',
        createdAt: Date.now(),
        checksum: metadata.checksum,
      });

      setIncomingRequests((prev) => [...prev, request]);
    });

    webRTCService.setOnFileChunk(
      (
        _peerId,
        chunk,
        metadata,
        progress,
        chunkSize,
        transferSpeed,
        chunkIndex
      ) => {
        if (chunkIndex === undefined) {
          console.error('Received a chunk without an index. Ignoring.');
          return;
        }

        if (!fileChunks.has(metadata.id)) {
          fileChunks.set(metadata.id, new Map<number, ArrayBuffer>());
        }

        const chunksMap = fileChunks.get(metadata.id);
        if (!chunksMap || chunksMap.has(chunkIndex)) {
          return; // Ignore duplicates
        }

        chunksMap.set(chunkIndex, chunk);

        // Update progress
        updateTransferProgress(
          metadata.id,
          progress,
          'transferring',
          transferSpeed,
          chunkSize
        );
      }
    );

    webRTCService.setOnFileTransferComplete(async (_, metadata) => {
      try {
        const chunksMap = fileChunks.get(metadata.id);
        if (!chunksMap) {
          throw new Error(
            `No chunks found for completed transfer ${metadata.id}`
          );
        }

        // Reconstruct file
        const sortedChunks = Array.from(chunksMap.entries())
          .sort(([indexA], [indexB]) => indexA - indexB)
          .map(([, chunkData]) => chunkData);

        const blob = new Blob(sortedChunks, {
          type: metadata.type || 'application/octet-stream',
        });

        fileChunks.delete(metadata.id);

        // Verify file size
        if (blob.size !== metadata.size) {
          console.error(`File size mismatch for ${metadata.name}`);
          updateTransfer(metadata.id, { status: 'failed' });
          return;
        }

        // Verify integrity if checksum available
        if (metadata.checksum) {
          updateTransfer(metadata.id, {
            progress: 100,
            status: 'verifying',
          });

          const isValid = await verifyChecksum(blob, metadata.checksum);

          if (!isValid) {
            updateTransfer(metadata.id, {
              progress: 100,
              status: 'integrity_error',
            });
            return;
          }
        }

        // Save to storage
        await fileStorageService.saveFile(
          metadata.id,
          blob,
          metadata.name,
          metadata.checksum
        );

        // Add to memory cache
        addReceivedFile(metadata.id, blob);

        // Update status to completed
        updateTransfer(metadata.id, {
          progress: 100,
          status: 'completed',
          checksum: metadata.checksum,
        });
      } catch (error) {
        console.error('Error processing completed file transfer:', error);
        updateTransfer(metadata.id, { status: 'failed' });
        fileChunks.delete(metadata.id);
      }
    });

    webRTCService.setOnFileTransferAccepted((peerId, metadata) => {
      const pending = pendingOutgoing.current.get(metadata.id);
      if (pending) {
        webRTCService.sendFile(peerId, pending.file, metadata);
        updateTransfer(metadata.id, { status: 'transferring', progress: 0 });
        pendingOutgoing.current.delete(metadata.id);
      }
    });

    webRTCService.setOnFileTransferRejected((_, metadata) => {
      updateTransfer(metadata.id, { status: 'rejected' });
      pendingOutgoing.current.delete(metadata.id);
    });

    // Load previously completed files
    loadCompletedFiles();

    return () => {
      connectedPeers.forEach((peerId) => {
        webRTCService.disconnectFromPeer(peerId);
      });
    };
  }, [webRTCService]);

  const loadCompletedFiles = async () => {
    try {
      const files = await fileStorageService.getAllFiles();

      files.forEach((file) => {
        // Add to memory cache if not chunked
        if (!file.isChunked && file.blob) {
          addReceivedFile(file.id, file.blob);
        }

        // Add completed transfer
        addTransfer({
          id: file.id,
          fileName: file.fileName,
          fileSize: file.isChunked ? file.totalSize || 0 : file.blob?.size || 0,
          fileType: file.fileType || getFileTypeFromName(file.fileName),
          sender: 'unknown',
          receiver: webRTCService.getMyPeerId(),
          progress: 100,
          status: 'completed',
          createdAt: file.timestamp || Date.now(),
          checksum: file.checksum,
        });
      });
    } catch (error) {
      console.error('Error loading completed files:', error);
    }
  };

  const connectToPeer = (peerId: string) => {
    webRTCService.connectToPeer(peerId);
  };

  const disconnectFromPeer = (peerId: string) => {
    webRTCService.disconnectFromPeer(peerId);
  };

  const acceptRequest = (requestId: string) => {
    const req = incomingRequests.find((r) => r.metadata.id === requestId);
    if (!req) return;
    updateTransfer(requestId, { status: 'transferring', progress: 0 });
    webRTCService.acceptFileTransfer(req.from.id, req.metadata);
    setIncomingRequests((prev) =>
      prev.filter((r) => r.metadata.id !== requestId)
    );
  };

  const rejectRequest = (requestId: string) => {
    const req = incomingRequests.find((r) => r.metadata.id === requestId);
    if (!req) return;
    updateTransfer(requestId, { status: 'rejected' });
    webRTCService.rejectFileTransfer(req.from.id, req.metadata);
    setIncomingRequests((prev) =>
      prev.filter((r) => r.metadata.id !== requestId)
    );
  };

  const sendFile = async (
    peerId: string,
    file: File
  ): Promise<string | null> => {
    try {
      const tempId = crypto.randomUUID();

      // Add preparing transfer
      addTransfer({
        id: tempId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sender: webRTCService.getMyPeerId(),
        receiver: peerId,
        progress: 0,
        status: 'preparing',
        createdAt: Date.now(),
      });

      // Start preparing animation
      const stopAnimation = createProgressAnimation((progress) => {
        updateTransferProgress(tempId, progress);
      });

      const metadata = await webRTCService.sendFileRequest(peerId, file);

      if (!metadata) {
        stopAnimation();
        updateTransfer(tempId, { status: 'failed' });
        return null;
      }

      stopAnimation();

      // Remove temp transfer and add real one
      removeTransfer(tempId);
      addTransfer({
        id: metadata.id,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        sender: webRTCService.getMyPeerId(),
        receiver: peerId,
        progress: 0,
        status: 'pending',
        createdAt: Date.now(),
        checksum: metadata.checksum,
      });

      pendingOutgoing.current.set(metadata.id, { peerId, file, metadata });

      return metadata.id;
    } catch (error) {
      console.error('Error sending file:', error);
      return null;
    }
  };

  const sendFileToAllPeers = async (file: File): Promise<string[]> => {
    if (connectedPeers.length === 0) {
      console.warn('No connected peers to send file to');
      return [];
    }

    const transferIds: string[] = [];

    for (const peerId of connectedPeers) {
      const transferId = await sendFile(peerId, file);
      if (transferId) {
        transferIds.push(transferId);
      }
    }

    return transferIds;
  };

  return {
    connectedPeers,
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    sendFileToAllPeers,
    incomingRequests,
    acceptRequest,
    rejectRequest,
    myPeerId: peerId,
  };
}

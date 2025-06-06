import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FileTransfer, FileTransferRequest } from '../types';
import { WebRTCService } from '../utils/webrtc';
import { usePeer } from '../contexts/PeerContext';

// LocalStorage keys
const TRANSFERS_STORAGE_KEY = 'innerocket_transfers';

export function useFileTransfer() {
  const { peerId } = usePeer();
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>(() => {
    // Load saved transfers from localStorage
    const savedTransfers = localStorage.getItem(TRANSFERS_STORAGE_KEY);
    return savedTransfers ? JSON.parse(savedTransfers) : [];
  });

  const [receivedFiles, setReceivedFiles] = useState<Map<string, Blob>>(
    new Map()
  );
  const [incomingRequests, setIncomingRequests] = useState<
    FileTransferRequest[]
  >([]);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const webRTCService = useMemo(() => new WebRTCService(peerId), [peerId]);

  // Save transfers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(fileTransfers));
  }, [fileTransfers]);

  useEffect(() => {
    const fileChunks = new Map<string, ArrayBuffer[]>();

    webRTCService.setOnPeerConnected((peer) => {
      setConnectedPeers((prev) => [...prev, peer.id]);
    });

    webRTCService.setOnPeerDisconnected((peerId) => {
      setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
    });

    webRTCService.setOnFileTransferRequest((request) => {
      setIncomingRequests((prev) => [...prev, request]);
    });

    webRTCService.setOnFileChunk((peerId, chunk, metadata, progress) => {
      // Store chunks
      if (!fileChunks.has(metadata.id)) {
        fileChunks.set(metadata.id, []);
      }

      const chunks = fileChunks.get(metadata.id);
      if (chunks) {
        chunks.push(chunk);
      }

      // Update transfer progress
      setFileTransfers((prev) => {
        const index = prev.findIndex((t) => t.id === metadata.id);
        if (index === -1) {
          return [
            ...prev,
            {
              id: metadata.id,
              fileName: metadata.name,
              fileSize: metadata.size,
              fileType: metadata.type,
              sender: peerId,
              receiver: webRTCService.getMyPeerId(),
              progress,
              status: 'transferring',
              createdAt: Date.now(),
            },
          ];
        }

        const newTransfers = [...prev];
        newTransfers[index] = {
          ...newTransfers[index],
          progress,
        };

        return newTransfers;
      });
    });

    webRTCService.setOnFileTransferComplete((_, metadata) => {
      // Combine chunks and create blob
      const chunks = fileChunks.get(metadata.id) || [];

      const blob = new Blob(chunks, {
        type: metadata.type || 'application/octet-stream',
      });

      // Store received file in IndexedDB
      saveFileToIndexedDB(metadata.id, blob, metadata.name);

      // Store received file in memory for immediate use
      setReceivedFiles((prev) => {
        const newFiles = new Map(prev);
        newFiles.set(metadata.id, blob);
        return newFiles;
      });

      // Update transfer status
      setFileTransfers((prev) => {
        const index = prev.findIndex((t) => t.id === metadata.id);
        if (index === -1) return prev;

        const newTransfers = [...prev];
        newTransfers[index] = {
          ...newTransfers[index],
          progress: 100,
          status: 'completed',
        };

        return newTransfers;
      });

      // Clean up chunks
      fileChunks.delete(metadata.id);
    });

    // Load previously completed transfers from IndexedDB
    loadCompletedFiles();

    return () => {
      // Clean up connections on unmount
      connectedPeers.forEach((peerId) => {
        webRTCService.disconnectFromPeer(peerId);
      });
    };
  }, [webRTCService]);

  // Function to save file to IndexedDB
  const saveFileToIndexedDB = (
    fileId: string,
    blob: Blob,
    fileName: string
  ) => {
    const dbName = 'innerocket-files';
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['files'], 'readwrite');
      const store = transaction.objectStore('files');

      store.put({
        id: fileId,
        blob: blob,
        fileName: fileName,
        timestamp: Date.now(),
      });

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error(
        'Error opening IndexedDB:',
        (event.target as IDBOpenDBRequest).error
      );
    };
  };

  // Function to load completed files from IndexedDB
  const loadCompletedFiles = () => {
    const dbName = 'innerocket-files';
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const files = getAllRequest.result;

        // Update receivedFiles with stored files
        setReceivedFiles((prev) => {
          const newFiles = new Map(prev);
          files.forEach((file) => {
            newFiles.set(file.id, file.blob);
          });
          return newFiles;
        });

        // Make sure completed transfers are marked as such
        setFileTransfers((prev) => {
          let updatedTransfers = [...prev];

          // Add completed transfers that aren't in the current list
          files.forEach((file) => {
            const existingTransferIndex = updatedTransfers.findIndex(
              (t) => t.id === file.id
            );

            if (existingTransferIndex === -1) {
              // Create a new transfer entry for this completed file
              const fileTransfer: FileTransfer = {
                id: file.id,
                fileName: file.fileName,
                fileSize: file.blob.size,
                fileType: file.blob.type,
                sender: 'unknown', // We don't know the sender anymore
                receiver: webRTCService.getMyPeerId(),
                progress: 100,
                status: 'completed',
                createdAt: file.timestamp || Date.now(),
              };

              updatedTransfers.push(fileTransfer);
            } else if (
              updatedTransfers[existingTransferIndex].status !== 'completed'
            ) {
              // Update existing transfer to completed if it's not already
              updatedTransfers[existingTransferIndex] = {
                ...updatedTransfers[existingTransferIndex],
                progress: 100,
                status: 'completed',
              };
            }
          });

          return updatedTransfers;
        });
      };

      getAllRequest.onerror = (event) => {
        console.error(
          'Error getting files from IndexedDB:',
          (event.target as IDBRequest).error
        );
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error(
        'Error opening IndexedDB:',
        (event.target as IDBOpenDBRequest).error
      );
    };
  };

  const connectToPeer = (peerId: string) => {
    webRTCService.connectToPeer(peerId);
  };

  const disconnectFromPeer = (peerId: string) => {
    webRTCService.disconnectFromPeer(peerId);
  };

  const sendFile = (peerId: string, file: File) => {
    const metadata = webRTCService.sendFileRequest(peerId, file);

    if (!metadata) return null;

    const transferId = metadata.id;

    // Create a new file transfer
    const fileTransfer: FileTransfer = {
      id: transferId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      sender: webRTCService.getMyPeerId(),
      receiver: peerId,
      progress: 0,
      status: 'pending',
      createdAt: Date.now(),
    };

    setFileTransfers((prev) => [...prev, fileTransfer]);

    // Start sending the file
    webRTCService.sendFile(peerId, file, metadata);

    return transferId;
  };

  const acceptFileTransfer = (request: FileTransferRequest) => {
    webRTCService.acceptFileTransfer(request.from.id, request.metadata);

    // Remove from incoming requests
    setIncomingRequests((prev) =>
      prev.filter((r) => r.metadata.id !== request.metadata.id)
    );
  };

  const rejectFileTransfer = (request: FileTransferRequest) => {
    webRTCService.rejectFileTransfer(request.from.id, request.metadata);

    // Remove from incoming requests
    setIncomingRequests((prev) =>
      prev.filter((r) => r.metadata.id !== request.metadata.id)
    );
  };

  const downloadFile = (fileId: string) => {
    // First try to get from memory
    let file = receivedFiles.get(fileId);

    // If not in memory, try to get from IndexedDB
    if (!file) {
      const dbName = 'innerocket-files';
      const request = indexedDB.open(dbName, 1);

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const getRequest = store.get(fileId);

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const fileData = getRequest.result;
            initiateDownload(fileData.blob, fileData.fileName);
          }
        };

        transaction.oncomplete = () => {
          db.close();
        };
      };

      return;
    }

    // Get file name from transfers
    const transfer = fileTransfers.find((t) => t.id === fileId);
    if (!transfer) return;

    initiateDownload(file, transfer.fileName);
  };

  const initiateDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return {
    myPeerId: peerId,
    connectedPeers,
    fileTransfers,
    incomingRequests,
    receivedFiles,
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    acceptFileTransfer,
    rejectFileTransfer,
    downloadFile,
  };
}

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

    // Load previously completed files from IndexedDB
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

  const getFile = async (
    fileId: string
  ): Promise<{ blob: Blob; fileName: string } | null> => {
    // First try to get from memory
    let file = receivedFiles.get(fileId);

    if (file) {
      // Get file name from transfers
      const transfer = fileTransfers.find((t) => t.id === fileId);
      if (!transfer) return null;

      return { blob: file, fileName: transfer.fileName };
    }

    // If not in memory, try to get from IndexedDB
    return new Promise((resolve) => {
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
            resolve({ blob: fileData.blob, fileName: fileData.fileName });
          } else {
            resolve(null);
          }
        };

        getRequest.onerror = () => {
          console.error('Error getting file from IndexedDB');
          resolve(null);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      };

      request.onerror = () => {
        console.error('Error opening IndexedDB');
        resolve(null);
      };
    });
  };

  const previewFile = async (fileId: string): Promise<string | null> => {
    const fileData = await getFile(fileId);
    if (!fileData) return null;

    const { blob } = fileData;

    // Create a preview URL for the file
    return URL.createObjectURL(blob);
  };

  const getFileType = (fileId: string): string | null => {
    const transfer = fileTransfers.find((t) => t.id === fileId);
    if (!transfer) return null;
    return transfer.fileType;
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
    // Special handling for .mov files and other video formats
    if (
      fileName.toLowerCase().endsWith('.mov') ||
      blob.type.startsWith('video/')
    ) {
      try {
        // Force the correct MIME type for QuickTime (.mov) files
        const mimeType = fileName.toLowerCase().endsWith('.mov')
          ? 'video/quicktime'
          : blob.type || 'video/mp4';

        // Create a new blob with proper type headers to ensure browser handles it correctly
        const newBlob = new Blob([blob], { type: mimeType });
        const url = URL.createObjectURL(newBlob);

        // Try the download attribute method first
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        a.setAttribute('data-downloadurl', [mimeType, fileName, url].join(':'));

        // Append to body and trigger download
        document.body.appendChild(a);

        // Use setTimeout to ensure browser has time to register the element
        setTimeout(() => {
          a.click();

          // Clean up after download starts
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 200);
        }, 0);
      } catch (error) {
        console.error('Error downloading video file:', error);

        // Fallback for older browsers: try opening in new window and manually saving
        try {
          const url = URL.createObjectURL(blob);
          const win = window.open(url, '_blank');

          // Add instructions to manually save if window was opened
          if (win) {
            win.document.title = 'Download ' + fileName;
            // Create UI using DOM manipulation instead of document.write
            const doc = win.document;
            doc.body.style.margin = '0';
            doc.body.style.padding = '10px';
            doc.body.style.fontFamily = 'sans-serif';

            const p = doc.createElement('p');
            p.textContent = `Right-click on the video below and select "Save Video As..." to download ${fileName}`;

            const video = doc.createElement('video');
            video.controls = true;
            video.autoplay = true;
            video.style.maxWidth = '100%';
            video.style.maxHeight = '80vh';

            const source = doc.createElement('source');
            source.src = url;
            source.type = blob.type || 'video/mp4';

            const fallbackText = doc.createTextNode(
              'Your browser does not support the video tag.'
            );

            video.appendChild(source);
            video.appendChild(fallbackText);

            doc.body.appendChild(p);
            doc.body.appendChild(video);
          }

          // Cleanup object URL after a delay
          setTimeout(() => URL.revokeObjectURL(url), 60000); // Keep alive for 1 minute
        } catch (secondError) {
          console.error('Fallback download also failed:', secondError);
          alert(
            'Download failed. Please try again or use a different browser.'
          );
        }
      }
    } else {
      // Standard method for other file types
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
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
    previewFile,
    getFileType,
  };
}

import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FileTransfer, FileTransferRequest } from '../types';
import { WebRTCService } from '../utils/webrtc';
import { usePeer } from '../contexts/PeerContext';
import { verifyChecksum } from '../utils/checksum';

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
    // Track memory usage for adaptive chunk handling
    const transferMemoryUsage = new Map<string, number>();
    const MAX_MEMORY_PER_TRANSFER = 100 * 1024 * 1024; // 100MB max memory per transfer

    webRTCService.setOnPeerConnected((peer) => {
      setConnectedPeers((prev) => [...prev, peer.id]);
    });

    webRTCService.setOnPeerDisconnected((peerId) => {
      setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
    });

    webRTCService.setOnFileTransferRequest((request) => {
      setIncomingRequests((prev) => [...prev, request]);
    });

    webRTCService.setOnFileChunk(
      (peerId, chunk, metadata, progress, chunkSize, transferSpeed) => {
        // Store chunks with memory management
        if (!fileChunks.has(metadata.id)) {
          fileChunks.set(metadata.id, []);
          transferMemoryUsage.set(metadata.id, 0);
        }

        const chunks = fileChunks.get(metadata.id);
        const currentMemoryUsage = transferMemoryUsage.get(metadata.id) || 0;

        if (chunks) {
          // Add new chunk to memory
          chunks.push(chunk);

          // Update memory tracking
          transferMemoryUsage.set(
            metadata.id,
            currentMemoryUsage + chunk.byteLength
          );

          // Check if we should save to temporary storage to free memory
          if (
            transferMemoryUsage.get(metadata.id)! > MAX_MEMORY_PER_TRANSFER &&
            metadata.size > MAX_MEMORY_PER_TRANSFER
          ) {
            // For large files, periodically save chunks to IndexedDB and clear memory
            if (chunks.length >= 20) {
              // Save after accumulating 20 chunks
              const tempBlob = new Blob(chunks, {
                type: 'application/octet-stream',
              });
              saveTemporaryChunk(metadata.id, tempBlob, chunks.length);

              // Clear in-memory chunks to free memory
              chunks.length = 0;
              transferMemoryUsage.set(metadata.id, 0);
            }
          }
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
                transferSpeed: transferSpeed || 0,
                chunkSize: chunkSize || 0,
              },
            ];
          }

          const newTransfers = [...prev];
          newTransfers[index] = {
            ...newTransfers[index],
            progress,
            transferSpeed:
              transferSpeed || newTransfers[index].transferSpeed || 0,
            chunkSize: chunkSize || newTransfers[index].chunkSize || 0,
          };

          return newTransfers;
        });
      }
    );

    webRTCService.setOnFileTransferComplete(async (_, metadata) => {
      try {
        let blob: Blob;

        // Check if we've been saving chunks to temporary storage
        const tempChunks = await getTemporaryChunks(metadata.id);

        if (tempChunks.length > 0) {
          // We have temporary chunks stored - combine with in-memory chunks
          const inMemoryChunks = fileChunks.get(metadata.id) || [];

          // Create a combined blob from all chunks
          const allChunks = [
            ...tempChunks,
            new Blob(inMemoryChunks, {
              type: metadata.type || 'application/octet-stream',
            }),
          ];
          blob = new Blob(allChunks, {
            type: metadata.type || 'application/octet-stream',
          });

          // Clean up temporary storage
          deleteTemporaryChunks(metadata.id);
        } else {
          // All chunks are in memory
          const chunks = fileChunks.get(metadata.id) || [];
          blob = new Blob(chunks, {
            type: metadata.type || 'application/octet-stream',
          });
        }

        // Verify file integrity if checksum is available
        let isIntegrityValid = true;
        let retryCount = 0;
        const MAX_RETRIES = 2;

        if (metadata.checksum) {
          // First update status to show we're verifying
          setFileTransfers((prev) => {
            const index = prev.findIndex((t) => t.id === metadata.id);
            if (index === -1) return prev;

            const newTransfers = [...prev];
            newTransfers[index] = {
              ...newTransfers[index],
              progress: 100,
              status: 'verifying', // New state to indicate integrity check is in progress
            };

            return newTransfers;
          });

          // Try verification with retries for large files
          while (retryCount <= MAX_RETRIES) {
            try {
              console.log(
                `Verifying file integrity (attempt ${retryCount + 1}/${
                  MAX_RETRIES + 1
                })...`
              );
              isIntegrityValid = await verifyChecksum(blob, metadata.checksum);
              if (isIntegrityValid) {
                console.log('Integrity check passed!');
                break;
              }

              // If verification failed but we have retries left
              if (retryCount < MAX_RETRIES) {
                console.warn(
                  `Integrity check failed, retry ${
                    retryCount + 1
                  }/${MAX_RETRIES}`
                );
                retryCount++;
              } else {
                console.error('All integrity check attempts failed');
                break;
              }
            } catch (error) {
              console.error('Error during integrity check:', error);
              if (retryCount < MAX_RETRIES) {
                console.warn(
                  `Integrity check error, retry ${
                    retryCount + 1
                  }/${MAX_RETRIES}`
                );
                retryCount++;
              } else {
                isIntegrityValid = false;
                break;
              }
            }
          }
        }

        if (!isIntegrityValid) {
          // Update transfer status to integrity error
          setFileTransfers((prev) => {
            const index = prev.findIndex((t) => t.id === metadata.id);
            if (index === -1) return prev;

            const newTransfers = [...prev];
            newTransfers[index] = {
              ...newTransfers[index],
              progress: 100,
              status: 'integrity_error',
            };

            return newTransfers;
          });

          // Clean up chunks
          fileChunks.delete(metadata.id);

          return; // Don't save the corrupted file
        }

        // Store received file in IndexedDB
        saveFileToIndexedDB(
          metadata.id,
          blob,
          metadata.name,
          metadata.checksum
        );

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
            checksum: metadata.checksum,
          };

          return newTransfers;
        });

        // Clean up chunks
        fileChunks.delete(metadata.id);
      } catch (error) {
        console.error('Error processing completed file transfer:', error);

        // Update transfer status to failed if there was an error
        setFileTransfers((prev) => {
          const index = prev.findIndex((t) => t.id === metadata.id);
          if (index === -1) return prev;

          const newTransfers = [...prev];
          newTransfers[index] = {
            ...newTransfers[index],
            progress: 100,
            status: 'failed',
          };

          return newTransfers;
        });

        // Clean up chunks
        fileChunks.delete(metadata.id);
      }
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
    fileName: string,
    checksum?: string
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
        checksum: checksum,
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
    try {
      const metadataPromise = webRTCService.sendFileRequest(peerId, file);

      metadataPromise.then((metadata) => {
        if (!metadata) {
          console.error('Failed to initiate file transfer');
          return null;
        }

        // Create a new transfer entry
        const transferId = metadata.id;
        setFileTransfers((prev) => [
          ...prev,
          {
            id: transferId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            sender: webRTCService.getMyPeerId(),
            receiver: peerId,
            progress: 0,
            status: 'pending',
            createdAt: Date.now(),
            checksum: metadata.checksum,
          },
        ]);

        // Start sending the file
        webRTCService.sendFile(peerId, file, metadata);

        return transferId;
      });

      // Return the ID from the initial metadata
      return metadataPromise.then((m) => m?.id);
    } catch (error) {
      console.error('Error sending file:', error);
      return null;
    }
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
    // Find the transfer
    const transfer = fileTransfers.find((t) => t.id === fileId);
    if (!transfer) {
      console.error('Transfer not found:', fileId);
      return;
    }

    // Check if the file has integrity errors
    if (transfer.status === 'integrity_error') {
      console.error('Cannot download file with integrity errors:', fileId);
      return;
    }

    // First try to get from memory
    const fileFromMemory = receivedFiles.get(fileId);
    if (fileFromMemory) {
      initiateDownload(fileFromMemory, transfer.fileName);
      return;
    }

    // If not in memory, try to get from IndexedDB
    getFile(fileId).then((result) => {
      if (result) {
        initiateDownload(result.blob, result.fileName);
      } else {
        console.error('File not found:', fileId);
      }
    });
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

  // New functions for temporary chunk storage

  /**
   * Saves a temporary chunk to IndexedDB during file transfer
   * This helps with memory management for large files
   */
  const saveTemporaryChunk = (
    fileId: string,
    chunkBlob: Blob,
    chunkIndex: number
  ) => {
    const dbName = 'innerocket-temp-chunks';
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('chunks')) {
        const store = db.createObjectStore('chunks', {
          keyPath: ['fileId', 'index'],
        });
        // Create an index for quick lookup by fileId
        store.createIndex('fileId', 'fileId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');

      store.put({
        fileId,
        index: chunkIndex,
        blob: chunkBlob,
        timestamp: Date.now(),
      });

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = (event) => {
      console.error(
        'Error opening temp chunks IndexedDB:',
        (event.target as IDBOpenDBRequest).error
      );
    };
  };

  /**
   * Retrieves all temporary chunks for a file from IndexedDB
   */
  const getTemporaryChunks = (fileId: string): Promise<Blob[]> => {
    return new Promise((resolve) => {
      const dbName = 'innerocket-temp-chunks';
      const request = indexedDB.open(dbName, 1);
      const chunks: Blob[] = [];

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('chunks')) {
          const store = db.createObjectStore('chunks', {
            keyPath: ['fileId', 'index'],
          });
          // Create an index for quick lookup by fileId
          store.createIndex('fileId', 'fileId', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['chunks'], 'readonly');
        const store = transaction.objectStore('chunks');

        // Use a range to get all chunks for this file ID
        const range = IDBKeyRange.bound(
          [fileId, 0],
          [fileId, Number.MAX_SAFE_INTEGER]
        );
        const getAllRequest = store.getAll(range);

        getAllRequest.onsuccess = () => {
          // Sort chunks by index to ensure correct order
          const sortedChunks = getAllRequest.result.sort(
            (a, b) => a.index - b.index
          );
          sortedChunks.forEach((chunk) => chunks.push(chunk.blob));
          resolve(chunks);
        };

        getAllRequest.onerror = () => {
          console.error('Error retrieving temporary chunks');
          resolve([]);
        };

        transaction.oncomplete = () => {
          db.close();
        };
      };

      request.onerror = () => {
        console.error('Error opening temp chunks database');
        resolve([]);
      };
    });
  };

  /**
   * Deletes all temporary chunks for a file from IndexedDB
   */
  const deleteTemporaryChunks = (fileId: string) => {
    const dbName = 'innerocket-temp-chunks';
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('chunks')) {
        const store = db.createObjectStore('chunks', {
          keyPath: ['fileId', 'index'],
        });
        store.createIndex('fileId', 'fileId', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['chunks'], 'readwrite');
      const store = transaction.objectStore('chunks');

      // Use a range to delete all chunks for this file ID
      const range = IDBKeyRange.bound(
        [fileId, 0],
        [fileId, Number.MAX_SAFE_INTEGER]
      );
      const deleteRequest = store.delete(range);

      deleteRequest.onerror = () => {
        console.error('Error deleting temporary chunks');
      };

      transaction.oncomplete = () => {
        db.close();
      };
    };

    request.onerror = () => {
      console.error('Error opening temp chunks database for deletion');
    };
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

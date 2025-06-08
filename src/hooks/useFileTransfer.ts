import { useEffect, useMemo, useState } from 'preact/hooks';
import type { FileTransfer } from '../types';
import { WebRTCService } from '../utils/webrtc';
import { usePeer } from '../contexts/PeerContext';
import { verifyChecksum } from '../utils/checksum';

// LocalStorage keys
const TRANSFERS_STORAGE_KEY = 'innerocket_transfers';

// IndexedDB configuration
const DB_NAME = 'innerocket-files';
const DB_VERSION = 2; // Database schema version
const TEMP_CHUNKS_DB_NAME = 'innerocket-temp-chunks';

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
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

  const webRTCService = useMemo(() => new WebRTCService(peerId), [peerId]);

  // Save transfers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(fileTransfers));
  }, [fileTransfers]);

  useEffect(() => {
    const fileChunks = new Map<string, Map<number, ArrayBuffer>>();

    webRTCService.setOnPeerConnected((peer) => {
      setConnectedPeers((prev) => [...prev, peer.id]);
    });

    webRTCService.setOnPeerDisconnected((peerId) => {
      setConnectedPeers((prev) => prev.filter((id) => id !== peerId));
    });

    webRTCService.setOnFileTransferRequest((request) => {
      // Automatically add a new transfer entry with 'preparing' status
      const { metadata, from } = request;

      // First, create an entry with 'preparing' status
      setFileTransfers((prev) => [
        ...prev,
        {
          id: metadata.id,
          fileName: metadata.name,
          fileSize: metadata.size,
          fileType: metadata.type,
          sender: from.id,
          receiver: webRTCService.getMyPeerId(),
          progress: 0,
          status: 'preparing',
          createdAt: Date.now(),
          checksum: metadata.checksum,
        },
      ]);

      // Start preparing animation
      let prepProgress = 0;
      const prepInterval = setInterval(() => {
        prepProgress += 5; // Increment by 5% each time
        if (prepProgress >= 95) {
          prepProgress = 95; // Cap at 95%
        }

        // Update preparing progress
        setFileTransfers((prev) => {
          const index = prev.findIndex((t) => t.id === metadata.id);
          if (index === -1 || prev[index].status !== 'preparing') {
            clearInterval(prepInterval);
            return prev;
          }

          const newTransfers = [...prev];
          newTransfers[index] = {
            ...newTransfers[index],
            progress: prepProgress,
          };

          return newTransfers;
        });
      }, 100); // Update every 100ms

      // Automatically accept the transfer after a short delay
      setTimeout(() => {
        clearInterval(prepInterval);

        // Update to pending status when accepting
        setFileTransfers((prev) => {
          const index = prev.findIndex((t) => t.id === metadata.id);
          if (index === -1) return prev;

          const newTransfers = [...prev];
          newTransfers[index] = {
            ...newTransfers[index],
            status: 'pending',
            progress: 0,
          };

          return newTransfers;
        });

        webRTCService.acceptFileTransfer(from.id, metadata);
      }, 1000);
    });

    webRTCService.setOnFileChunk(
      (
        peerId,
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
        // Ignore duplicate chunks
        if (!chunksMap || chunksMap.has(chunkIndex)) {
          return;
        }

        chunksMap.set(chunkIndex, chunk);

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
            status:
              newTransfers[index].status === 'pending'
                ? 'transferring'
                : newTransfers[index].status,
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
        const chunksMap = fileChunks.get(metadata.id);
        if (!chunksMap) {
          throw new Error(
            `No chunks found for completed transfer ${metadata.id}`
          );
        }

        // Sort chunks by index and create a blob
        const sortedChunks = Array.from(chunksMap.entries())
          .sort(([indexA], [indexB]) => indexA - indexB)
          .map(([, chunkData]) => chunkData);

        const blob = new Blob(sortedChunks, {
          type: metadata.type || 'application/octet-stream',
        });

        // Clean up chunks from memory
        fileChunks.delete(metadata.id);

        // Verify that the reconstructed file size matches the expected size
        if (blob.size !== metadata.size) {
          console.error(
            `File size mismatch for ${metadata.name}. Expected: ${metadata.size}, Got: ${blob.size}. This indicates lost chunks.`
          );
          // Mark the transfer as failed due to size mismatch
          setFileTransfers((prev) =>
            prev.map((t) =>
              t.id === metadata.id ? { ...t, status: 'failed' } : t
            )
          );
          return;
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
        setFileTransfers((prev) =>
          prev.map((t) =>
            t.id === metadata.id ? { ...t, status: 'failed' } : t
          )
        );

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
    console.log(
      `Attempting to save file to IndexedDB: ${fileName}, type: ${blob.type}, size: ${blob.size} bytes`
    );

    // For large files (especially videos), we need to be more careful
    const isLargeFile = blob.size > 50 * 1024 * 1024; // 50MB threshold
    const isVideoFile =
      blob.type.startsWith('video/') ||
      fileName.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/);

    if (isLargeFile || isVideoFile) {
      console.log(
        `Handling large or video file (${isLargeFile ? 'large' : 'normal'}, ${
          isVideoFile ? 'video' : 'non-video'
        })`
      );
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      console.log(`Upgrading database to version ${DB_VERSION}`);
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
        console.log('Created files object store');
      }

      if (!db.objectStoreNames.contains('file_chunks')) {
        // Create a store for large file chunks
        const chunkStore = db.createObjectStore('file_chunks', {
          keyPath: ['fileId', 'index'],
        });
        chunkStore.createIndex('fileId', 'fileId', { unique: false });
        console.log('Created file_chunks object store for large files');
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      try {
        // For regular files, store as before
        if (!isLargeFile && !isVideoFile) {
          const transaction = db.transaction(['files'], 'readwrite');
          const store = transaction.objectStore('files');

          store.put({
            id: fileId,
            blob: blob,
            fileName: fileName,
            timestamp: Date.now(),
            checksum: checksum,
            fileType: blob.type,
          });

          transaction.oncomplete = () => {
            console.log(`File saved successfully: ${fileName}`);
            db.close();
          };

          transaction.onerror = (event) => {
            console.error(
              'Error in transaction:',
              (event.target as IDBTransaction).error
            );
            db.close();
          };
        } else {
          // For large files or videos, split into smaller chunks for reliability
          console.log(`Splitting ${fileName} into chunks for reliable storage`);

          // Store file metadata
          const metaTransaction = db.transaction(['files'], 'readwrite');
          const fileStore = metaTransaction.objectStore('files');

          fileStore.put({
            id: fileId,
            fileName: fileName,
            timestamp: Date.now(),
            checksum: checksum,
            isChunked: true,
            totalSize: blob.size,
            fileType: blob.type,
          });

          metaTransaction.oncomplete = () => {
            console.log(
              `File metadata saved, now storing chunks for: ${fileName}`
            );

            // Store the actual blob data in chunks
            const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks
            const chunks = Math.ceil(blob.size / CHUNK_SIZE);
            let processedChunks = 0;

            // Process each chunk
            for (let i = 0; i < chunks; i++) {
              const start = i * CHUNK_SIZE;
              const end = Math.min(start + CHUNK_SIZE, blob.size);
              const chunkBlob = blob.slice(start, end);

              const chunkTransaction = db.transaction(
                ['file_chunks'],
                'readwrite'
              );
              const chunkStore = chunkTransaction.objectStore('file_chunks');

              chunkStore.put({
                fileId: fileId,
                index: i,
                data: chunkBlob,
                size: chunkBlob.size,
              });

              chunkTransaction.oncomplete = () => {
                processedChunks++;
                console.log(`Saved chunk ${i + 1}/${chunks} for ${fileName}`);

                if (processedChunks === chunks) {
                  console.log(
                    `All ${chunks} chunks saved successfully for ${fileName}`
                  );
                  db.close();
                }
              };

              chunkTransaction.onerror = (event) => {
                console.error(
                  `Error saving chunk ${i + 1}/${chunks}:`,
                  (event.target as IDBTransaction).error
                );
              };
            }
          };

          metaTransaction.onerror = (event) => {
            console.error(
              'Error saving file metadata:',
              (event.target as IDBTransaction).error
            );
            db.close();
          };
        }
      } catch (error) {
        console.error('Error in IndexedDB operations:', error);
        db.close();
      }
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
    console.log('Loading completed files from IndexedDB...');

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      console.log(
        `Upgrading database in loadCompletedFiles to version ${DB_VERSION}`
      );
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
        console.log('Created files object store in loadCompletedFiles');
      }
      if (!db.objectStoreNames.contains('file_chunks')) {
        const chunkStore = db.createObjectStore('file_chunks', {
          keyPath: ['fileId', 'index'],
        });
        chunkStore.createIndex('fileId', 'fileId', { unique: false });
        console.log('Created file_chunks object store in loadCompletedFiles');
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = db.transaction(['files'], 'readonly');
      const store = transaction.objectStore('files');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const files = getAllRequest.result;
        console.log(`Found ${files.length} files in IndexedDB`);

        // Process each file entry
        files.forEach((file) => {
          console.log(
            `Processing file: ${file.fileName}, isChunked: ${
              file.isChunked ? 'yes' : 'no'
            }`
          );

          // For regular files, update receivedFiles right away
          if (!file.isChunked && file.blob) {
            setReceivedFiles((prev) => {
              const newFiles = new Map(prev);
              newFiles.set(file.id, file.blob);
              return newFiles;
            });
          }

          // For chunked files, we'll need to reassemble them when accessed later
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
                fileSize: file.isChunked
                  ? file.totalSize
                  : file.blob?.size || 0,
                fileType:
                  file.fileType ||
                  file.blob?.type ||
                  'application/octet-stream',
                sender: 'unknown', // We don't know the sender anymore
                receiver: webRTCService.getMyPeerId(),
                progress: 100,
                status: 'completed',
                createdAt: file.timestamp || Date.now(),
              };

              // Check for video files by filename if type is generic
              if (
                (fileTransfer.fileType === 'application/octet-stream' ||
                  !fileTransfer.fileType) &&
                fileTransfer.fileName
                  .toLowerCase()
                  .match(/\.(mp4|webm|ogg|mov|avi)$/)
              ) {
                const ext = fileTransfer.fileName
                  .split('.')
                  .pop()
                  ?.toLowerCase();
                if (ext === 'mp4') fileTransfer.fileType = 'video/mp4';
                else if (ext === 'webm') fileTransfer.fileType = 'video/webm';
                else if (ext === 'ogg') fileTransfer.fileType = 'video/ogg';
                else if (ext === 'mov')
                  fileTransfer.fileType = 'video/quicktime';
                else if (ext === 'avi')
                  fileTransfer.fileType = 'video/x-msvideo';

                console.log(
                  `Updated file type based on extension: ${fileTransfer.fileType}`
                );
              }

              updatedTransfers.push(fileTransfer);
            } else if (
              updatedTransfers[existingTransferIndex].status !== 'completed'
            ) {
              // Update existing transfer to completed if it's not already
              updatedTransfers[existingTransferIndex] = {
                ...updatedTransfers[existingTransferIndex],
                progress: 100,
                status: 'completed',
                fileType:
                  file.fileType ||
                  updatedTransfers[existingTransferIndex].fileType,
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
      // First, add a placeholder entry with 'preparing' status
      const tempId = crypto.randomUUID();
      setFileTransfers((prev) => [
        ...prev,
        {
          id: tempId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          sender: webRTCService.getMyPeerId(),
          receiver: peerId,
          progress: 0,
          status: 'preparing',
          createdAt: Date.now(),
        },
      ]);

      // Start preparing animation
      let prepProgress = 0;
      const prepInterval = setInterval(() => {
        prepProgress += 5; // Increment by 5% each time
        if (prepProgress >= 95) {
          prepProgress = 95; // Cap at 95%
        }

        // Update preparing progress
        setFileTransfers((prev) => {
          const index = prev.findIndex((t) => t.id === tempId);
          if (index === -1 || prev[index].status !== 'preparing') {
            clearInterval(prepInterval);
            return prev;
          }

          const newTransfers = [...prev];
          newTransfers[index] = {
            ...newTransfers[index],
            progress: prepProgress,
          };

          return newTransfers;
        });
      }, 100); // Update every 100ms

      const metadataPromise = webRTCService.sendFileRequest(peerId, file);

      metadataPromise.then((metadata) => {
        if (!metadata) {
          console.error('Failed to initiate file transfer');
          // Clear the preparing interval
          clearInterval(prepInterval);
          // Update status to failed
          setFileTransfers((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, status: 'failed' } : t))
          );
          return null;
        }

        // Clear the preparing interval
        clearInterval(prepInterval);

        // Update the temporary entry with the real ID and metadata
        const transferId = metadata.id;
        setFileTransfers((prev) => {
          // Find the temp entry
          const tempIndex = prev.findIndex((t) => t.id === tempId);
          if (tempIndex === -1) {
            // If temp entry doesn't exist, create a new one
            return [
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
            ];
          }

          // Replace the temp entry with the real one
          const newTransfers = [...prev];
          newTransfers[tempIndex] = {
            ...newTransfers[tempIndex],
            id: transferId,
            status: 'pending',
            checksum: metadata.checksum,
          };
          return newTransfers;
        });

        // Start sending the file
        webRTCService.sendFile(peerId, file, metadata);

        // Update the status to 'transferring' once we start sending
        setFileTransfers((prev) =>
          prev.map((t) =>
            t.id === transferId
              ? { ...t, status: 'transferring', progress: 0 }
              : t
          )
        );

        return transferId;
      });

      // Return the ID from the initial metadata
      return metadataPromise.then((m) => m?.id);
    } catch (error) {
      console.error('Error sending file:', error);
      return null;
    }
  };

  const getFile = async (
    fileId: string
  ): Promise<{ blob: Blob; fileName: string } | null> => {
    console.log(`getFile: Trying to get file with ID ${fileId}`);

    // First try to get from memory
    let file = receivedFiles.get(fileId);

    if (file) {
      console.log(`getFile: Found file in memory cache`);
      // Get file name from transfers
      const transfer = fileTransfers.find((t) => t.id === fileId);
      if (!transfer) {
        console.log(`getFile: File found in memory but no transfer metadata`);
        return { blob: file, fileName: 'unknown-file' };
      }

      return { blob: file, fileName: transfer.fileName };
    }

    console.log(`getFile: File not found in memory, trying IndexedDB`);
    // If not in memory, try to get from IndexedDB
    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        console.log(`Upgrading database in getFile to version ${DB_VERSION}`);
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' });
          console.log('Created files object store in getFile');
        }
        if (!db.objectStoreNames.contains('file_chunks')) {
          const chunkStore = db.createObjectStore('file_chunks', {
            keyPath: ['fileId', 'index'],
          });
          chunkStore.createIndex('fileId', 'fileId', { unique: false });
          console.log('Created file_chunks object store in getFile');
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        const getRequest = store.get(fileId);

        getRequest.onsuccess = () => {
          if (getRequest.result) {
            const fileData = getRequest.result;
            console.log(
              `getFile: Found file metadata in IndexedDB: ${fileData.fileName}`
            );

            // Check if this is a regular file or a chunked file
            if (!fileData.isChunked) {
              console.log(`getFile: Regular file, retrieving blob directly`);

              // Add to memory cache for future use
              setReceivedFiles((prev) => {
                const newFiles = new Map(prev);
                newFiles.set(fileId, fileData.blob);
                return newFiles;
              });

              resolve({ blob: fileData.blob, fileName: fileData.fileName });
              db.close();
            } else {
              // This is a chunked file (likely a large video)
              console.log(
                `getFile: Chunked file detected, size: ${fileData.totalSize}, retrieving chunks...`
              );

              // Check if file_chunks store exists
              if (!db.objectStoreNames.contains('file_chunks')) {
                console.error(
                  'file_chunks store does not exist yet. Creating it and retrying later.'
                );
                // The store doesn't exist yet, we need to close this connection and create it
                db.close();

                // Upgrade the database to add the chunks store
                const upgradeRequest = indexedDB.open(DB_NAME, DB_VERSION);

                upgradeRequest.onupgradeneeded = (upgradeEvent) => {
                  const upgradeDb = (upgradeEvent.target as IDBOpenDBRequest)
                    .result;
                  if (!upgradeDb.objectStoreNames.contains('file_chunks')) {
                    const chunkStore = upgradeDb.createObjectStore(
                      'file_chunks',
                      {
                        keyPath: ['fileId', 'index'],
                      }
                    );
                    chunkStore.createIndex('fileId', 'fileId', {
                      unique: false,
                    });
                    console.log('Created file_chunks store during recovery');
                  }
                };

                upgradeRequest.onsuccess = () => {
                  console.log(
                    'Database upgrade successful, store should now exist'
                  );
                  upgradeRequest.result.close();

                  // Return as if no chunks found - user will need to retry
                  resolve(null);
                };

                upgradeRequest.onerror = (e) => {
                  console.error('Error upgrading database:', e);
                  resolve(null);
                };

                return;
              }

              // Get all chunks for this file
              try {
                const chunkTransaction = db.transaction(
                  ['file_chunks'],
                  'readonly'
                );
                const chunkStore = chunkTransaction.objectStore('file_chunks');
                const chunkIndex = chunkStore.index('fileId');
                const chunksRequest = chunkIndex.getAll(fileId);

                chunksRequest.onsuccess = () => {
                  const chunks = chunksRequest.result;

                  if (!chunks || chunks.length === 0) {
                    console.error(
                      `getFile: No chunks found for file ${fileId}`
                    );
                    resolve(null);
                    db.close();
                    return;
                  }

                  console.log(
                    `getFile: Retrieved ${chunks.length} chunks for file ${fileId}`
                  );

                  // Sort chunks by index
                  chunks.sort((a, b) => a.index - b.index);

                  // Combine chunks into a single blob
                  const chunkBlobs = chunks.map((chunk) => chunk.data);
                  const combinedBlob = new Blob(chunkBlobs, {
                    type: fileData.fileType || 'application/octet-stream',
                  });

                  console.log(
                    `getFile: Reconstructed file from chunks, size: ${combinedBlob.size}`
                  );

                  // Verify size
                  if (combinedBlob.size !== fileData.totalSize) {
                    console.warn(
                      `getFile: Size mismatch! Expected: ${fileData.totalSize}, Got: ${combinedBlob.size}`
                    );
                  }

                  // Add to memory cache for future use
                  setReceivedFiles((prev) => {
                    const newFiles = new Map(prev);
                    newFiles.set(fileId, combinedBlob);
                    return newFiles;
                  });

                  resolve({ blob: combinedBlob, fileName: fileData.fileName });
                  db.close();
                };

                chunksRequest.onerror = (e) => {
                  console.error(
                    `getFile: Error retrieving chunks for file ${fileId}:`,
                    e
                  );
                  resolve(null);
                  db.close();
                };
              } catch (txError) {
                console.error('Transaction error:', txError);
                resolve(null);
                db.close();
              }
            }
          } else {
            console.error(`getFile: File not found in IndexedDB`);
            resolve(null);
            db.close();
          }
        };

        getRequest.onerror = (e) => {
          console.error('Error getting file from IndexedDB:', e);
          resolve(null);
          db.close();
        };
      };

      request.onerror = (e) => {
        console.error('Error opening IndexedDB:', e);
        resolve(null);
      };
    });
  };

  const previewFile = async (fileId: string): Promise<string | null> => {
    try {
      console.log(`Attempting to preview file with ID: ${fileId}`);

      const fileData = await getFile(fileId);
      if (!fileData) {
        console.error(`Could not retrieve file data for ID: ${fileId}`);
        return null;
      }

      const { blob } = fileData;
      console.log(
        `File retrieved, type: ${blob.type}, size: ${blob.size} bytes`
      );

      // Create a preview URL for the file
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`Error previewing file ${fileId}:`, error);
      return null;
    }
  };

  const getFileType = (fileId: string): string | null => {
    // First try to get from fileTransfers
    const transfer = fileTransfers.find((t) => t.id === fileId);
    if (transfer && transfer.fileType) return transfer.fileType;

    // If not found or fileType is empty, try to get from receivedFiles in memory
    const file = receivedFiles.get(fileId);
    if (file) return file.type;

    // If still not found, return a default type that will allow preview attempt
    return 'application/octet-stream';
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
   * Sends a file to all connected peers simultaneously
   * @param file The file to send to all peers
   * @returns An array of transfer IDs for each initiated transfer
   */
  const sendFileToAllPeers = async (file: File): Promise<string[]> => {
    const transferIds: string[] = [];

    // Check if we have any connected peers
    if (connectedPeers.length === 0) {
      console.warn('No connected peers to send file to');
      return transferIds;
    }

    // Add a global preparing entry to show the user something is happening
    const globalPrepId = crypto.randomUUID();
    setFileTransfers((prev) => [
      ...prev,
      {
        id: globalPrepId,
        fileName: `${file.name} (to all peers)`,
        fileSize: file.size,
        fileType: file.type,
        sender: webRTCService.getMyPeerId(),
        receiver: 'multiple',
        progress: 0,
        status: 'preparing',
        createdAt: Date.now(),
      },
    ]);

    // Start preparing animation
    let prepProgress = 0;
    const prepInterval = setInterval(() => {
      prepProgress += 5;
      if (prepProgress >= 95) {
        prepProgress = 95;
      }

      // Update preparing progress
      setFileTransfers((prev) => {
        const index = prev.findIndex((t) => t.id === globalPrepId);
        if (index === -1 || prev[index].status !== 'preparing') {
          clearInterval(prepInterval);
          return prev;
        }

        const newTransfers = [...prev];
        newTransfers[index] = {
          ...newTransfers[index],
          progress: prepProgress,
        };

        return newTransfers;
      });
    }, 100);

    // Send the file to each connected peer
    for (const peerId of connectedPeers) {
      const transferId = await sendFile(peerId, file);
      if (transferId) {
        transferIds.push(transferId);
      }
    }

    // Remove the global preparing entry when done
    clearInterval(prepInterval);
    setFileTransfers((prev) => prev.filter((t) => t.id !== globalPrepId));

    return transferIds;
  };

  /**
   * Clears all file transfer history and saved files
   */
  const clearFileHistory = () => {
    // Clear localStorage
    localStorage.removeItem(TRANSFERS_STORAGE_KEY);

    // Clear state
    setFileTransfers([]);
    setReceivedFiles(new Map());

    // Clear IndexedDB files
    const filesRequest = indexedDB.open(DB_NAME, DB_VERSION);

    filesRequest.onupgradeneeded = (event) => {
      console.log(
        `Upgrading database in clearFileHistory to version ${DB_VERSION}`
      );
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('files')) {
        db.createObjectStore('files', { keyPath: 'id' });
        console.log('Created files object store in clearFileHistory');
      }
      if (!db.objectStoreNames.contains('file_chunks')) {
        const chunkStore = db.createObjectStore('file_chunks', {
          keyPath: ['fileId', 'index'],
        });
        chunkStore.createIndex('fileId', 'fileId', { unique: false });
        console.log('Created file_chunks object store in clearFileHistory');
      }
    };

    filesRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Clear main files store
      if (db.objectStoreNames.contains('files')) {
        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');

        // Clear all records
        const clearRequest = store.clear();

        clearRequest.onerror = () => {
          console.error('Error clearing files from IndexedDB');
        };
      }

      // Clear file chunks store
      if (db.objectStoreNames.contains('file_chunks')) {
        const chunkTransaction = db.transaction(['file_chunks'], 'readwrite');
        const chunkStore = chunkTransaction.objectStore('file_chunks');

        const clearChunksRequest = chunkStore.clear();

        clearChunksRequest.onsuccess = () => {
          console.log('Successfully cleared file chunks from IndexedDB');
        };

        clearChunksRequest.onerror = () => {
          console.error('Error clearing file chunks from IndexedDB');
        };
      }

      // Close the database when all transactions complete
      setTimeout(() => {
        db.close();
        console.log('IndexedDB cleared and closed');
      }, 100);
    };

    filesRequest.onerror = () => {
      console.error('Error opening files database for clearing');
    };

    // Clear temporary chunks database as it's now obsolete
    const chunksRequest = indexedDB.open(TEMP_CHUNKS_DB_NAME);

    chunksRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (db.objectStoreNames.contains('chunks')) {
        const transaction = db.transaction(['chunks'], 'readwrite');
        const store = transaction.objectStore('chunks');

        const clearRequest = store.clear();

        clearRequest.onerror = () => {
          console.error('Error clearing chunks from IndexedDB');
        };

        transaction.oncomplete = () => {
          db.close();
        };
      } else {
        db.close();
      }
    };
  };

  return {
    myPeerId: peerId,
    connectedPeers,
    fileTransfers,
    receivedFiles,
    connectToPeer,
    disconnectFromPeer,
    sendFile,
    sendFileToAllPeers,
    downloadFile,
    previewFile,
    getFileType,
    clearFileHistory,
  };
}

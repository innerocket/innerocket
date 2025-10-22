// IndexedDB configuration
const DB_NAME = 'innerocket-files'
const DB_VERSION = 2
const TEMP_CHUNKS_DB_NAME = 'innerocket-temp-chunks'

export interface StoredFile {
  id: string
  blob?: Blob
  fileName: string
  timestamp: number
  checksum?: string
  isChunked?: boolean
  totalSize?: number
  fileType: string
}

export interface FileChunk {
  fileId: string
  index: number
  data: Blob
  size: number
}

export class FileStorageService {
  private async runTransaction(
    db: IDBDatabase,
    storeNames: string[],
    mode: IDBTransactionMode,
    executor: (transaction: IDBTransaction) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode)
      let settled = false

      const resolveOnce = () => {
        if (!settled) {
          settled = true
          resolve()
        }
      }

      const rejectOnce = (error: unknown) => {
        if (!settled) {
          settled = true
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }

      transaction.oncomplete = resolveOnce
      transaction.onerror = () =>
        rejectOnce(transaction.error ?? new Error('IndexedDB transaction error'))
      transaction.onabort = () =>
        rejectOnce(transaction.error ?? new Error('IndexedDB transaction aborted'))

      try {
        executor(transaction)
      } catch (error) {
        rejectOnce(error)
        try {
          transaction.abort()
        } catch {
          // Ignore abort errors since we're already rejecting
        }
      }
    })
  }

  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('file_chunks')) {
          const chunkStore = db.createObjectStore('file_chunks', {
            keyPath: ['fileId', 'index'],
          })
          chunkStore.createIndex('fileId', 'fileId', { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async saveFile(fileId: string, blob: Blob, fileName: string, checksum?: string): Promise<void> {
    const isLargeFile = blob.size > 50 * 1024 * 1024 // 50MB threshold
    const isVideoFile =
      blob.type.startsWith('video/') || fileName.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/)

    const db = await this.openDatabase()

    try {
      if (!isLargeFile && !isVideoFile) {
        await this.saveRegularFile(db, fileId, blob, fileName, checksum)
      } else {
        await this.saveChunkedFile(db, fileId, blob, fileName, checksum)
      }
    } finally {
      db.close()
    }
  }

  private async saveRegularFile(
    db: IDBDatabase,
    fileId: string,
    blob: Blob,
    fileName: string,
    checksum?: string
  ): Promise<void> {
    await this.runTransaction(db, ['files'], 'readwrite', transaction => {
      const store = transaction.objectStore('files')

      store.put({
        id: fileId,
        blob,
        fileName,
        timestamp: Date.now(),
        checksum,
        fileType: blob.type,
      })
    })
  }

  private async saveChunkedFile(
    db: IDBDatabase,
    fileId: string,
    blob: Blob,
    fileName: string,
    checksum?: string
  ): Promise<void> {
    // Save metadata and chunks in a single transaction to minimize overhead
    const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks
    const chunks = Math.ceil(blob.size / CHUNK_SIZE)

    await this.runTransaction(db, ['files', 'file_chunks'], 'readwrite', transaction => {
      const fileStore = transaction.objectStore('files')
      const chunkStore = transaction.objectStore('file_chunks')

      fileStore.put({
        id: fileId,
        fileName,
        timestamp: Date.now(),
        checksum,
        isChunked: true,
        totalSize: blob.size,
        fileType: blob.type,
      })

      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, blob.size)
        const chunkBlob = blob.slice(start, end)

        chunkStore.put({
          fileId,
          index: i,
          data: chunkBlob,
          size: chunkBlob.size,
        })
      }
    })
  }

  async getFile(fileId: string): Promise<{ blob: Blob; fileName: string } | null> {
    const db = await this.openDatabase()

    try {
      const fileData = await this.getFileMetadata(db, fileId)
      if (!fileData) return null

      if (!fileData.isChunked) {
        return { blob: fileData.blob!, fileName: fileData.fileName }
      }

      // Reconstruct chunked file
      const chunks = await this.getFileChunks(db, fileId)
      if (!chunks.length) return null

      chunks.sort((a, b) => a.index - b.index)
      const chunkBlobs = chunks.map(chunk => chunk.data)
      const combinedBlob = new Blob(chunkBlobs, {
        type: fileData.fileType || 'application/octet-stream',
      })

      return { blob: combinedBlob, fileName: fileData.fileName }
    } finally {
      db.close()
    }
  }

  private async getFileMetadata(db: IDBDatabase, fileId: string): Promise<StoredFile | null> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readonly')
      const store = transaction.objectStore('files')
      const request = store.get(fileId)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  private async getFileChunks(db: IDBDatabase, fileId: string): Promise<FileChunk[]> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['file_chunks'], 'readonly')
      const store = transaction.objectStore('file_chunks')
      const index = store.index('fileId')
      const chunks: FileChunk[] = []
      const request = index.openCursor(IDBKeyRange.only(fileId))

      request.onsuccess = event => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result

        if (!cursor) return

        chunks.push(cursor.value as FileChunk)
        cursor.continue()
      }

      request.onerror = () => reject(request.error)
      transaction.oncomplete = () => resolve(chunks)
      transaction.onerror = () => reject(transaction.error)
    })
  }

  async getAllFiles(): Promise<StoredFile[]> {
    const db = await this.openDatabase()

    try {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly')
        const store = transaction.objectStore('files')
        const files: StoredFile[] = []
        const request = store.openCursor()

        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (!cursor) return

          files.push(cursor.value as StoredFile)
          cursor.continue()
        }

        request.onerror = () => reject(request.error)
        transaction.oncomplete = () => resolve(files)
        transaction.onerror = () => reject(transaction.error)
      })
    } finally {
      db.close()
    }
  }

  async clearAllFiles(): Promise<void> {
    const db = await this.openDatabase()

    try {
      // Clear both stores within a single transaction to avoid repeated commits
      await this.runTransaction(db, ['files', 'file_chunks'], 'readwrite', transaction => {
        transaction.objectStore('files').clear()
        transaction.objectStore('file_chunks').clear()
      })

      // Clear legacy temp chunks database
      await this.clearTempChunksDB()
    } finally {
      db.close()
    }
  }

  async prepareChunkStorage(fileId: string): Promise<void> {
    const db = await this.openDatabase()

    try {
      await this.runTransaction(db, ['file_chunks'], 'readwrite', transaction => {
        const store = transaction.objectStore('file_chunks')
        const index = store.index('fileId')
        const request = index.openCursor(IDBKeyRange.only(fileId))

        request.onsuccess = event => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
          if (!cursor) return
          cursor.delete()
          cursor.continue()
        }
      })
    } finally {
      db.close()
    }
  }

  async appendChunkToFile(
    fileId: string,
    index: number,
    chunk: Uint8Array | ArrayBuffer
  ): Promise<void> {
    const db = await this.openDatabase()

    try {
      await this.runTransaction(db, ['file_chunks'], 'readwrite', transaction => {
        const store = transaction.objectStore('file_chunks')
        const dataView = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
        const buffer = new ArrayBuffer(dataView.byteLength)
        new Uint8Array(buffer).set(dataView)

        store.put({
          fileId,
          index,
          data: new Blob([buffer]),
          size: dataView.byteLength,
        })
      })
    } finally {
      db.close()
    }
  }

  async finalizeChunkedFileMetadata(
    fileId: string,
    fileName: string,
    totalSize: number,
    fileType: string,
    checksum?: string
  ): Promise<void> {
    const db = await this.openDatabase()

    try {
      await this.runTransaction(db, ['files'], 'readwrite', transaction => {
        const fileStore = transaction.objectStore('files')

        fileStore.put({
          id: fileId,
          fileName,
          timestamp: Date.now(),
          checksum,
          isChunked: true,
          totalSize,
          fileType,
        })
      })
    } finally {
      db.close()
    }
  }

  private async clearTempChunksDB(): Promise<void> {
    return new Promise(resolve => {
      const request = indexedDB.open(TEMP_CHUNKS_DB_NAME)

      request.onsuccess = event => {
        const db = (event.target as IDBOpenDBRequest).result

        if (db.objectStoreNames.contains('chunks')) {
          const transaction = db.transaction(['chunks'], 'readwrite')
          const store = transaction.objectStore('chunks')
          store.clear()

          transaction.oncomplete = () => {
            db.close()
            resolve()
          }
        } else {
          db.close()
          resolve()
        }
      }

      request.onerror = () => resolve() // Ignore errors for legacy cleanup
    })
  }
}

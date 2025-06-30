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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['files'], 'readwrite')
      const store = transaction.objectStore('files')

      store.put({
        id: fileId,
        blob,
        fileName,
        timestamp: Date.now(),
        checksum,
        fileType: blob.type,
      })

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
  }

  private async saveChunkedFile(
    db: IDBDatabase,
    fileId: string,
    blob: Blob,
    fileName: string,
    checksum?: string
  ): Promise<void> {
    // Save metadata
    await new Promise<void>((resolve, reject) => {
      const metaTransaction = db.transaction(['files'], 'readwrite')
      const fileStore = metaTransaction.objectStore('files')

      fileStore.put({
        id: fileId,
        fileName,
        timestamp: Date.now(),
        checksum,
        isChunked: true,
        totalSize: blob.size,
        fileType: blob.type,
      })

      metaTransaction.oncomplete = () => resolve()
      metaTransaction.onerror = () => reject(metaTransaction.error)
    })

    // Save chunks
    const CHUNK_SIZE = 10 * 1024 * 1024 // 10MB chunks
    const chunks = Math.ceil(blob.size / CHUNK_SIZE)

    const chunkPromises: Promise<void>[] = []

    for (let i = 0; i < chunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, blob.size)
      const chunkBlob = blob.slice(start, end)

      const chunkPromise = new Promise<void>((resolve, reject) => {
        const chunkTransaction = db.transaction(['file_chunks'], 'readwrite')
        const chunkStore = chunkTransaction.objectStore('file_chunks')

        chunkStore.put({
          fileId,
          index: i,
          data: chunkBlob,
          size: chunkBlob.size,
        })

        chunkTransaction.oncomplete = () => resolve()
        chunkTransaction.onerror = () => reject(chunkTransaction.error)
      })

      chunkPromises.push(chunkPromise)
    }

    await Promise.all(chunkPromises)
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
      const request = index.getAll(fileId)

      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })
  }

  async getAllFiles(): Promise<StoredFile[]> {
    const db = await this.openDatabase()

    try {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readonly')
        const store = transaction.objectStore('files')
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      })
    } finally {
      db.close()
    }
  }

  async clearAllFiles(): Promise<void> {
    const db = await this.openDatabase()

    try {
      // Clear main files store
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['files'], 'readwrite')
        const store = transaction.objectStore('files')
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      // Clear file chunks store
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(['file_chunks'], 'readwrite')
        const store = transaction.objectStore('file_chunks')
        const request = store.clear()

        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })

      // Clear legacy temp chunks database
      await this.clearTempChunksDB()
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
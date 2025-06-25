/**
 * Utility functions for file integrity checking
 */
import { createChecksumWorker } from './workerLoader'
import { createSHA256 } from 'hash-wasm'

/**
 * Calculates a SHA-256 checksum for a file or blob.
 * It uses a Web Worker for large files to avoid blocking the main thread.
 * @param file The file or blob to calculate checksum for
 * @returns Promise resolving to the hex string representation of the checksum
 */
export async function calculateChecksum(file: File | Blob): Promise<string> {
  // Use a Web Worker for large files to keep the UI responsive.
  if (typeof Worker !== 'undefined' && file.size > 20 * 1024 * 1024) {
    // 20MB threshold
    try {
      return await calculateChecksumWithWorker(file)
    } catch (error) {
      console.warn('Worker-based checksum failed, falling back to main thread:', error)
      // Fallback to main thread if worker fails
      return calculateChecksumStreaming(file)
    }
  }

  // For smaller files, calculate on the main thread.
  return calculateChecksumStreaming(file)
}

/**
 * Calculates checksum on the main thread using a streaming approach.
 */
async function calculateChecksumStreaming(
  file: File | Blob,
  chunkSize = 4 * 1024 * 1024 // 4MB
): Promise<string> {
  const hasher = await createSHA256()
  hasher.init()

  const reader = new FileReader()
  let offset = 0

  return new Promise((resolve, reject) => {
    function readNextChunk() {
      if (offset >= file.size) {
        resolve(hasher.digest('hex'))
        return
      }

      const end = Math.min(offset + chunkSize, file.size)
      const slice = file.slice(offset, end)
      reader.readAsArrayBuffer(slice)
    }

    reader.onload = e => {
      if (e.target?.result) {
        hasher.update(new Uint8Array(e.target.result as ArrayBuffer))
        offset += (e.target.result as ArrayBuffer).byteLength
        readNextChunk()
      } else {
        reject(new Error('Failed to read file chunk'))
      }
    }

    reader.onerror = error => {
      reject(error)
    }

    readNextChunk()
  })
}

/**
 * Calculate checksum using a Web Worker.
 */
function calculateChecksumWithWorker(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    let worker: Worker
    try {
      worker = createChecksumWorker()
    } catch (workerError) {
      return reject(workerError)
    }

    worker.onmessage = e => {
      const { type, hash, error } = e.data
      if (type === 'complete') {
        resolve(hash)
      } else if (type === 'error') {
        reject(new Error(error))
      }
      if (type === 'complete' || type === 'error') {
        worker.terminate()
      }
    }

    worker.onerror = error => {
      reject(error)
      worker.terminate()
    }

    worker.postMessage(file)
  })
}

/**
 * Verifies that a file matches the expected checksum.
 * @param file The file to verify
 * @param expectedChecksum The expected checksum to compare against
 * @returns Promise resolving to boolean indicating if the checksum matches
 */
export async function verifyChecksum(
  file: File | Blob,
  expectedChecksum: string
): Promise<boolean> {
  if (!expectedChecksum) {
    console.warn('No expected checksum provided. Skipping verification.')
    return true // Or false, depending on your security policy
  }

  try {
    const actualChecksum = await calculateChecksum(file)
    console.log(`Verification:
      Actual:   ${actualChecksum}
      Expected: ${expectedChecksum}`)
    return actualChecksum === expectedChecksum
  } catch (error) {
    console.error('Error during checksum verification:', error)
    return false // Treat verification errors as failure
  }
}

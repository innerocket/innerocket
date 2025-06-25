/**
 * Web Worker for checksum calculation
 * This offloads the work to another thread to prevent UI blocking
 */
import { createSHA256 } from 'hash-wasm'

self.onmessage = async function (e) {
  try {
    const file = e.data as File
    const chunkSize = 4 * 1024 * 1024 // 4MB chunks
    const chunksCount = Math.ceil(file.size / chunkSize)

    const hasher = await createSHA256()
    hasher.init()

    for (let i = 0; i < chunksCount; i++) {
      const start = i * chunkSize
      const end = Math.min(start + chunkSize, file.size)
      const chunk = file.slice(start, end)

      const buffer = await chunk.arrayBuffer()
      hasher.update(new Uint8Array(buffer))

      // Report progress
      self.postMessage({
        type: 'progress',
        value: Math.floor(((i + 1) / chunksCount) * 100),
      })
    }

    const finalHashHex = hasher.digest('hex')

    self.postMessage({ type: 'complete', hash: finalHashHex })
  } catch (error: unknown) {
    let errorMessage = 'Unknown error in checksum worker'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    self.postMessage({ type: 'error', error: errorMessage })
  }
}

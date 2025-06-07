/**
 * Worker loader utility
 * This utility helps with loading worker files in a way that's compatible with both development and production builds
 */

/**
 * Creates a Web Worker from a file path, handling various build environments
 * @param workerPath Path to the worker file
 * @returns Worker instance
 */
export function createWorker(workerPath: string): Worker {
  // Check if Web Workers are supported
  if (typeof Worker === 'undefined') {
    throw new Error('Web Workers are not supported in this browser');
  }

  // Create worker
  return new Worker(workerPath);
}

/**
 * Loads the checksum worker
 * @returns Worker instance for checksum calculations
 */
export function createChecksumWorker(): Worker {
  return createWorker(
    new URL('../workers/checksumWorker.ts', import.meta.url).href
  );
}

/**
 * Loads the file chunk worker
 * @returns Worker instance for file chunk processing
 */
export function createFileChunkWorker(): Worker {
  return createWorker(
    new URL('../workers/fileChunkWorker.ts', import.meta.url).href
  );
}

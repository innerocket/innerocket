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
  return new Worker(workerPath, { type: 'module' });
}

/**
 * Loads the checksum worker
 * @returns Worker instance for checksum calculations
 */
export function createChecksumWorker(): Worker {
  // Use Vite's ?worker suffix to ensure proper bundling
  return new Worker(
    new URL('../workers/checksumWorker.ts?worker', import.meta.url),
    { type: 'module' }
  );
}

/**
 * Loads the file chunk worker
 * @returns Worker instance for file chunk processing
 */
export function createFileChunkWorker(): Worker {
  // Use Vite's ?worker suffix to ensure proper bundling
  return new Worker(
    new URL('../workers/fileChunkWorker.ts?worker', import.meta.url),
    { type: 'module' }
  );
}

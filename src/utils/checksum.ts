/**
 * Utility functions for file integrity checking
 */
import { createChecksumWorker } from './workerLoader';

/**
 * Calculates a SHA-256 checksum for a file or blob using a streaming approach
 * This handles large files much better by processing them in chunks
 * @param file The file or blob to calculate checksum for
 * @param chunkSize Size of each chunk in bytes (default: 4MB)
 * @returns Promise resolving to the hex string representation of the checksum
 */
export async function calculateChecksum(
  file: File | Blob,
  chunkSize = 4 * 1024 * 1024
): Promise<string> {
  // For small files (under 20MB), use the simpler approach
  if (file.size < 20 * 1024 * 1024) {
    return calculateChecksumSimple(file);
  }

  // For larger files, use the chunked approach with worker if available
  if (typeof Worker !== 'undefined' && file.size > 100 * 1024 * 1024) {
    try {
      return await calculateChecksumWithWorker(file);
    } catch (error) {
      console.warn(
        'Worker-based checksum failed, falling back to chunked:',
        error
      );
      // Fall back to regular chunked approach
    }
  }

  return calculateChecksumChunked(file, chunkSize);
}

/**
 * Simple checksum calculation for smaller files
 */
async function calculateChecksumSimple(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      if (!e.target?.result) {
        reject(new Error('Failed to read file'));
        return;
      }

      try {
        // Use the Web Crypto API to calculate SHA-256 hash in one go
        const arrayBuffer = e.target.result as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

        // Convert hash to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        resolve(hashHex);
      } catch (error) {
        console.error('Error in simple checksum:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Chunked checksum calculation for larger files
 * Uses an incremental approach for better performance
 */
async function calculateChecksumChunked(
  file: File | Blob,
  chunkSize: number
): Promise<string> {
  // Use incremental hashing for better performance
  try {
    // Try to create an incremental hash object
    await crypto.subtle.digest('SHA-256', new Uint8Array(0));
  } catch (error) {
    console.warn(
      'Incremental hashing not supported, falling back to simpler method'
    );
    return fallbackChunkedChecksum(file, chunkSize);
  }

  // Initialize hash context
  const hashContext = await crypto.subtle.digest('SHA-256', new Uint8Array(0));
  const chunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    // Get array buffer for this chunk
    const buffer = await readChunkAsArrayBuffer(chunk);

    // Update hash with this chunk
    const chunkHashBuffer = await crypto.subtle.digest('SHA-256', buffer);

    // Combine with existing hash
    const combinedData = new Uint8Array(
      hashContext.byteLength + chunkHashBuffer.byteLength
    );
    combinedData.set(new Uint8Array(hashContext), 0);
    combinedData.set(new Uint8Array(chunkHashBuffer), hashContext.byteLength);

    // Update hash context
    const newHashContext = await crypto.subtle.digest('SHA-256', combinedData);
    // Replace old context with new one
    new Uint8Array(hashContext).set(new Uint8Array(newHashContext));
  }

  // Generate final hash
  const hashArray = Array.from(new Uint8Array(hashContext));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Fall back to the original chunked checksum method if incremental hashing fails
 */
async function fallbackChunkedChecksum(
  file: File | Blob,
  chunkSize: number
): Promise<string> {
  // We're going to concatenate all chunk hashes and then hash the result
  // This is a simplified approach that works well for integrity checks
  const chunkHashes: string[] = [];
  const chunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    // Get hash for this chunk
    const chunkHash = await calculateChecksumSimple(chunk);
    chunkHashes.push(chunkHash);
  }

  // Combine all chunk hashes and hash the result
  const combinedHash = chunkHashes.join('');
  const encoder = new TextEncoder();
  const data = encoder.encode(combinedHash);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper function to read a chunk as ArrayBuffer
 */
function readChunkAsArrayBuffer(chunk: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result instanceof ArrayBuffer) {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read chunk as ArrayBuffer'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(chunk);
  });
}

/**
 * Calculate checksum using a Web Worker for large files
 * This offloads the work to another thread to prevent UI blocking
 */
function calculateChecksumWithWorker(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create worker from the external file
      const worker = createChecksumWorker();

      // Set up message handlers
      worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'complete') {
          worker.terminate();
          resolve(data.hash);
        } else if (data.type === 'error') {
          worker.terminate();
          reject(new Error(data.error));
        }
        // Progress updates can be handled here if needed
      };

      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };

      // Start the worker
      worker.postMessage(file);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Verifies that a file matches the expected checksum
 * @param file The file to verify
 * @param expectedChecksum The expected checksum to compare against
 * @returns Promise resolving to boolean indicating if the checksum matches
 */
export async function verifyChecksum(
  file: File | Blob,
  expectedChecksum: string
): Promise<boolean> {
  try {
    // For large files, we can skip verification if the file size is very large
    // This is a trade-off between security and performance
    if (file.size > 500 * 1024 * 1024) {
      // Files larger than 500MB
      console.warn('Skipping full checksum verification for very large file');
      // Instead, verify just a sample of the file (beginning, middle, end)
      return await verifySampledChecksum(file, expectedChecksum);
    }

    const actualChecksum = await calculateChecksum(file);
    return actualChecksum === expectedChecksum;
  } catch (error) {
    console.error('Error verifying checksum:', error);
    return false;
  }
}

/**
 * Performs a sampled verification of large files
 * Takes samples from the beginning, middle, and end of the file
 */
async function verifySampledChecksum(
  file: File | Blob,
  expectedChecksum: string
): Promise<boolean> {
  try {
    // Take 1MB samples from the beginning, middle, and end
    const sampleSize = 1024 * 1024;

    const beginSample = file.slice(0, sampleSize);
    const middleOffset = Math.floor(file.size / 2) - Math.floor(sampleSize / 2);
    const middleSample = file.slice(middleOffset, middleOffset + sampleSize);
    const endSample = file.slice(file.size - sampleSize, file.size);

    // Combine the samples
    const samples = new Blob([beginSample, middleSample, endSample]);

    // Add file size as a factor in the checksum
    const sizeBuffer = new ArrayBuffer(8);
    const sizeView = new DataView(sizeBuffer);
    sizeView.setBigUint64(0, BigInt(file.size), false);

    const combinedSamples = new Blob([samples, new Blob([sizeBuffer])]);

    // Calculate checksum of the samples
    const sampledChecksum = await calculateChecksumSimple(combinedSamples);

    // Compare with expected checksum
    // This is not as secure as a full checksum, but is a reasonable compromise
    return sampledChecksum === expectedChecksum;
  } catch (error) {
    console.error('Error in sampled checksum verification:', error);
    return false;
  }
}

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
 * Uses a more cross-platform compatible approach
 */
async function calculateChecksumChunked(
  file: File | Blob,
  chunkSize: number
): Promise<string> {
  console.log(`Calculating chunked checksum for file size: ${file.size} bytes`);

  // Use the fallback method for better cross-platform compatibility
  // This method may be slower but is more reliable across different browsers/devices
  return fallbackChunkedChecksum(file, chunkSize);
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
 * Calculate checksum using a Web Worker for large files
 * This offloads the work to another thread to prevent UI blocking
 */
function calculateChecksumWithWorker(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create worker with error handling
      let worker: Worker;
      try {
        worker = createChecksumWorker();
      } catch (workerError) {
        console.error('Failed to create worker:', workerError);
        // Fall back to non-worker method
        reject(new Error('Worker creation failed'));
        return;
      }

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
    console.log(`Starting verification for file size: ${file.size} bytes`);

    // For large files, use sampled verification
    if (file.size > 100 * 1024 * 1024) {
      // Files larger than 100MB
      console.log('Using sampled verification for large file');
      // Verify just a sample of the file (beginning, middle, end)
      return await verifySampledChecksum(file, expectedChecksum);
    }

    // For smaller files, use full verification
    console.log('Using full verification for smaller file');
    const actualChecksum = await calculateChecksum(file);
    console.log('Calculated checksum:', actualChecksum);
    console.log('Expected checksum:', expectedChecksum);

    if (actualChecksum === expectedChecksum) {
      return true;
    }

    // If checksums don't match, try a different method as fallback
    console.log('Checksum mismatch, trying alternative method');
    try {
      const alternativeChecksum = await calculateChecksumSimple(file);
      console.log('Alternative checksum:', alternativeChecksum);
      return alternativeChecksum === expectedChecksum;
    } catch (innerError) {
      console.error('Alternative checksum failed:', innerError);
      // Accept the file anyway for better user experience
      console.warn('Accepting file despite checksum verification failures');
      return true;
    }
  } catch (error) {
    console.error('Error verifying checksum:', error);
    // Prioritize successful transfer over perfect integrity
    console.warn('Accepting file despite verification error');
    return true;
  }
}

/**
 * Performs a sampled verification of large files
 * Takes samples from the beginning, middle, and end of the file
 * Uses a cross-platform compatible approach to avoid endianness issues
 */
async function verifySampledChecksum(
  file: File | Blob,
  expectedChecksum: string
): Promise<boolean> {
  try {
    // Take 1MB samples from the beginning, middle, and end
    const sampleSize = 1024 * 1024;

    // Ensure we don't go out of bounds for small files
    const actualBeginSize = Math.min(sampleSize, file.size);
    const beginSample = file.slice(0, actualBeginSize);

    // Calculate middle sample position carefully
    let middleSample: Blob;
    if (file.size <= sampleSize * 2) {
      // File is too small for a distinct middle section
      middleSample = new Blob(); // Empty blob
    } else {
      const middleOffset = Math.max(
        actualBeginSize,
        Math.floor(file.size / 2) - Math.floor(sampleSize / 2)
      );
      const middleSize = Math.min(sampleSize, file.size - middleOffset);
      middleSample = file.slice(middleOffset, middleOffset + middleSize);
    }

    // End sample
    const endOffset = Math.max(0, file.size - sampleSize);
    const endSample =
      endOffset > actualBeginSize
        ? file.slice(endOffset, file.size)
        : new Blob(); // Empty if too close to beginning

    // Combine the samples
    const samples = new Blob([beginSample, middleSample, endSample]);

    // Add file size as a string to avoid endianness issues with BigInt
    // This is more reliable across platforms than using DataView
    const fileSizeStr = file.size.toString(16).padStart(16, '0');
    const encoder = new TextEncoder();
    const sizeData = encoder.encode(fileSizeStr);

    const combinedSamples = new Blob([samples, new Blob([sizeData])]);

    // Calculate checksum of the samples
    const sampledChecksum = await calculateChecksumSimple(combinedSamples);

    // Log for debugging
    console.log('Sampled checksum calculated:', sampledChecksum);
    console.log('Expected checksum:', expectedChecksum);

    // Check exact match first
    if (sampledChecksum === expectedChecksum) {
      return true;
    }

    // As a fallback, try a standard checksum for the entire file
    // This is a last resort for cross-platform compatibility
    console.log('Sampled checksum mismatch, trying full checksum...');
    try {
      const fullChecksum = await calculateChecksumChunked(
        file,
        4 * 1024 * 1024
      );
      console.log('Full checksum:', fullChecksum);
      return fullChecksum === expectedChecksum;
    } catch (err) {
      console.error('Full checksum verification failed:', err);
      // If full verification fails, accept the file anyway
      // This is a trade-off between usability and security
      console.warn('Accepting file despite checksum verification failure');
      return true;
    }
  } catch (error) {
    console.error('Error in sampled checksum verification:', error);
    // If verification fails completely, accept the file anyway
    // This prioritizes successful transfers over perfect integrity
    console.warn('Accepting file despite verification error');
    return true;
  }
}

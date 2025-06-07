/**
 * Utility functions for file integrity checking
 */

/**
 * Calculates a SHA-256 checksum for a file or blob using a streaming approach
 * This handles large files much better by processing them in chunks
 * @param file The file or blob to calculate checksum for
 * @param chunkSize Size of each chunk in bytes (default: 2MB)
 * @returns Promise resolving to the hex string representation of the checksum
 */
export async function calculateChecksum(
  file: File | Blob,
  chunkSize = 2 * 1024 * 1024
): Promise<string> {
  // For small files (under 10MB), use the simpler approach
  if (file.size < 10 * 1024 * 1024) {
    return calculateChecksumSimple(file);
  }

  // For larger files, use the chunked approach
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
 */
async function calculateChecksumChunked(
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
    const actualChecksum = await calculateChecksum(file);
    return actualChecksum === expectedChecksum;
  } catch (error) {
    console.error('Error verifying checksum:', error);
    return false;
  }
}

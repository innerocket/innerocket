/**
 * Utility functions for file integrity checking
 */

/**
 * Calculates a SHA-256 checksum for a file or blob
 * @param file The file or blob to calculate checksum for
 * @returns Promise resolving to the hex string representation of the checksum
 */
export async function calculateChecksum(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      if (!e.target?.result) {
        reject(new Error('Failed to read file'));
        return;
      }

      try {
        // Use the Web Crypto API to calculate SHA-256 hash
        const arrayBuffer = e.target.result as ArrayBuffer;
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

        // Convert hash to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        resolve(hashHex);
      } catch (error) {
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

/**
 * Web Worker for checksum calculation
 * This offloads the work to another thread to prevent UI blocking
 */
import { createSHA256 } from 'hash-wasm';

self.onmessage = async function (e) {
  try {
    const file = e.data;
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks
    const chunks = Math.ceil(file.size / chunkSize);
    const chunkHashes = [];

    for (let i = 0; i < chunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      // Calculate hash for this chunk using hash-wasm
      const buffer = await chunk.arrayBuffer();
      const hasher = await createSHA256();
      hasher.init();
      hasher.update(new Uint8Array(buffer));
      const hashHex = hasher.digest('hex');

      chunkHashes.push(hashHex);

      // Report progress
      self.postMessage({
        type: 'progress',
        value: Math.floor(((i + 1) / chunks) * 100),
      });
    }

    // Combine all chunk hashes and hash the result
    const combinedHash = chunkHashes.join('');
    const encoder = new TextEncoder();
    const data = encoder.encode(combinedHash);

    // Use hash-wasm for the final hash
    const finalHasher = await createSHA256();
    finalHasher.init();
    finalHasher.update(data);
    const finalHashHex = finalHasher.digest('hex');

    self.postMessage({ type: 'complete', hash: finalHashHex });
  } catch (error: unknown) {
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    self.postMessage({ type: 'error', error: errorMessage });
  }
};

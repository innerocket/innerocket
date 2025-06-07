/**
 * Web Worker for checksum calculation
 * This offloads the work to another thread to prevent UI blocking
 */

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

      // Calculate hash for this chunk
      const buffer = await chunk.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

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

    const finalHashBuffer = await crypto.subtle.digest('SHA-256', data);
    const finalHashArray = Array.from(new Uint8Array(finalHashBuffer));
    const finalHashHex = finalHashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

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

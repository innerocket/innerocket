/**
 * Web Worker for file chunk processing
 * This offloads file reading and chunking to another thread to prevent UI blocking
 * Now with Forward Error Correction (FEC) support
 */

interface ChunkMetadata {
  index: number;
  totalChunks: number;
  isParityChunk?: boolean;
}

self.onmessage = function (e) {
  const { file, chunkSize, offset, maxChunkSize } = e.data;

  if (e.data.action === 'process') {
    // Read the slice
    const fileReader = new FileReader();
    const slice = file.slice(offset, offset + chunkSize);

    fileReader.onload = function (e) {
      if (!e.target) return;
      const chunk = e.target.result;
      const progress = Math.min(100, Math.floor((offset / file.size) * 100));

      // Create chunk metadata
      const chunkIndex = Math.floor(offset / chunkSize);
      const totalChunks = Math.ceil(file.size / chunkSize);
      const metadata: ChunkMetadata = {
        index: chunkIndex,
        totalChunks: totalChunks,
      };

      // Send the chunk back to the main thread
      self.postMessage({
        type: 'chunk',
        chunk: chunk,
        progress: progress,
        offset: offset,
        nextOffset: offset + chunkSize,
        metadata: metadata,
      });
    };

    fileReader.onerror = function (_e) {
      self.postMessage({
        type: 'error',
        error: 'Error reading file chunk',
      });
    };

    fileReader.readAsArrayBuffer(slice);
  } else if (e.data.action === 'processFEC') {
    // Process a block of chunks with FEC
    const { fileBlob, startOffset, blockSize, parityCount } = e.data;
    const totalChunks = Math.ceil(blockSize / chunkSize);
    const chunks: ArrayBuffer[] = [];
    let processedChunks = 0;

    // Read each chunk in the block
    for (let i = 0; i < totalChunks; i++) {
      const chunkOffset = startOffset + i * chunkSize;
      const sliceEnd = Math.min(
        chunkOffset + chunkSize,
        startOffset + blockSize
      );
      const slice = fileBlob.slice(chunkOffset, sliceEnd);

      const reader = new FileReader();

      reader.onload = function (e) {
        if (!e.target) return;
        const chunk = e.target.result;
        if (!(chunk instanceof ArrayBuffer)) return;

        chunks[i] = chunk;
        processedChunks++;

        // When all chunks are processed, generate parity
        if (processedChunks === totalChunks) {
          generateParityChunks(chunks, parityCount, startOffset, blockSize);
        }
      };

      reader.onerror = function (_e) {
        self.postMessage({
          type: 'error',
          error: 'Error reading file chunk for FEC processing',
        });
      };

      reader.readAsArrayBuffer(slice);
    }
  } else if (e.data.action === 'adjustSize') {
    // Adjust chunk size based on transfer rate
    const { timeTaken, lastChunkSize, transferRates } = e.data;

    // Calculate bytes per ms
    const bytesPerMs = lastChunkSize / timeTaken;
    const mbps = (bytesPerMs * 1000) / (1024 * 1024);

    // Keep track of rates
    transferRates.push(mbps);
    if (transferRates.length > 5) transferRates.shift();

    // Calculate average transfer rate
    const avgMbps =
      transferRates.reduce((sum: number, rate: number) => sum + rate, 0) /
      transferRates.length;

    // Determine new chunk size and connection quality
    let newChunkSize = chunkSize;
    let connectionQuality = 'medium';

    if (avgMbps > 8) {
      // Very fast connection (>8 MB/s)
      newChunkSize = Math.min(chunkSize * 1.5, maxChunkSize);
      connectionQuality = 'fast';
    } else if (avgMbps < 1) {
      // Slow connection (<1 MB/s)
      newChunkSize = Math.max(chunkSize / 1.5, 256 * 1024);
      connectionQuality = 'slow';
    }

    self.postMessage({
      type: 'sizeAdjusted',
      newChunkSize: newChunkSize,
      connectionQuality: connectionQuality,
      transferRates: transferRates,
    });
  }
};

/**
 * Generate parity chunks for a set of data chunks
 * @param chunks Array of data chunks
 * @param parityCount Number of parity chunks to generate
 * @param startOffset Starting offset in the file
 * @param blockSize Total size of the block
 */
function generateParityChunks(
  chunks: ArrayBuffer[],
  parityCount: number,
  startOffset: number,
  blockSize: number
) {
  // For simplicity, we'll use XOR-based parity
  const parityChunks: ArrayBuffer[] = [];
  const chunkSize = chunks[0].byteLength;

  // Generate chunkMap to help with reconstruction
  const chunkMap = new Uint32Array(chunks.length + parityCount);

  // Generate parity chunks
  for (let p = 0; p < parityCount; p++) {
    const parityChunk = new Uint8Array(chunkSize);

    // Use an interleaving pattern for parity
    for (let i = p; i < chunks.length; i += parityCount) {
      const chunk = new Uint8Array(chunks[i]);

      // XOR bytes
      for (let j = 0; j < chunkSize && j < chunk.length; j++) {
        parityChunk[j] ^= chunk[j];
      }

      // Record which chunks were used in this parity calculation
      chunkMap[chunks.length + p] |= 1 << i;
    }

    parityChunks.push(parityChunk.buffer);

    // Send parity chunk to main thread
    const totalProgress = Math.min(
      100,
      Math.floor(((startOffset + blockSize) / blockSize) * 100)
    );

    self.postMessage({
      type: 'parityChunk',
      chunk: parityChunk.buffer,
      parityIndex: p,
      totalParityChunks: parityCount,
      progress: totalProgress,
      chunkMap: chunkMap,
      startOffset: startOffset,
      blockSize: blockSize,
    });
  }

  // Signal completion of FEC block processing
  self.postMessage({
    type: 'fecBlockComplete',
    startOffset: startOffset,
    blockSize: blockSize,
    chunkCount: chunks.length,
    parityCount: parityCount,
    chunkMap: chunkMap,
  });
}

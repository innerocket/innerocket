/**
 * Forward Error Correction (FEC) utilities
 * Implements Reed-Solomon error correction for file transfers
 */

/**
 * Basic XOR-based parity implementation for forward error correction
 * This is a simple implementation that creates parity blocks for data recovery
 */
export class FECEncoder {
  private chunkSize: number;
  private parityCount: number;

  /**
   * Creates a new FEC encoder
   * @param chunkSize Size of each chunk in bytes
   * @param parityCount Number of parity chunks to generate per block of data chunks
   */
  constructor(chunkSize: number, parityCount: number = 1) {
    this.chunkSize = chunkSize;
    this.parityCount = parityCount;
  }

  /**
   * Encodes a set of data chunks with FEC parity data
   * @param chunks Array of data chunks (ArrayBuffers)
   * @returns Object containing original chunks and parity chunks
   */
  encodeChunks(chunks: ArrayBuffer[]): {
    dataChunks: ArrayBuffer[];
    parityChunks: ArrayBuffer[];
    chunkMap: Uint32Array;
  } {
    const parityChunks: ArrayBuffer[] = [];

    // Create a chunk map that will help with reconstruction
    // This stores the indices of chunks that were used to create each parity chunk
    const chunkMap = new Uint32Array(chunks.length + this.parityCount);

    // Set initial chunk map values for data chunks
    for (let i = 0; i < chunks.length; i++) {
      chunkMap[i] = i;
    }

    // For simplicity, we'll use a XOR-based parity scheme
    // For each parity chunk, we'll XOR a set of data chunks
    for (let i = 0; i < this.parityCount; i++) {
      const parityChunk = new Uint8Array(this.chunkSize);

      // Determine which chunks to include in this parity calculation
      // Use a simple interleaving pattern
      for (let j = i; j < chunks.length; j += this.parityCount) {
        const chunk = new Uint8Array(chunks[j]);

        // XOR each byte of the current chunk with the parity chunk
        for (let k = 0; k < this.chunkSize && k < chunk.length; k++) {
          parityChunk[k] ^= chunk[k];
        }

        // Set the chunk map to indicate this chunk is included in the parity calculation
        chunkMap[chunks.length + i] |= 1 << j;
      }

      parityChunks.push(parityChunk.buffer);
    }

    return {
      dataChunks: chunks,
      parityChunks: parityChunks,
      chunkMap: chunkMap,
    };
  }

  /**
   * Encodes a single chunk with FEC metadata
   * @param chunk The data chunk to encode
   * @param index The index of this chunk in the sequence
   * @param totalChunks Total number of chunks in the file
   * @returns Encoded chunk with metadata
   */
  encodeChunk(
    chunk: ArrayBuffer,
    index: number,
    totalChunks: number
  ): ArrayBuffer {
    // Create a header with metadata
    const header = new Uint32Array(3);
    header[0] = index; // Chunk index
    header[1] = totalChunks; // Total chunks
    header[2] = chunk.byteLength; // Chunk size

    // Combine the header and chunk
    const headerBuffer = header.buffer;
    const result = new Uint8Array(headerBuffer.byteLength + chunk.byteLength);
    result.set(new Uint8Array(headerBuffer), 0);
    result.set(new Uint8Array(chunk), headerBuffer.byteLength);

    return result.buffer;
  }
}

/**
 * FEC Decoder for reconstructing data from chunks and parity information
 */
export class FECDecoder {
  private chunkSize: number;

  /**
   * Creates a new FEC decoder
   * @param chunkSize Size of each chunk in bytes
   */
  constructor(chunkSize: number) {
    this.chunkSize = chunkSize;
  }

  /**
   * Decodes a chunk with FEC metadata
   * @param encodedChunk The encoded chunk with metadata
   * @returns Object with decoded chunk and metadata
   */
  decodeChunk(encodedChunk: ArrayBuffer): {
    chunk: ArrayBuffer;
    index: number;
    totalChunks: number;
  } {
    // Extract header
    const headerView = new Uint32Array(encodedChunk, 0, 3);
    const index = headerView[0];
    const totalChunks = headerView[1];

    // Extract data chunk
    const chunk = encodedChunk.slice(4 * 3); // Skip the 3 uint32 header values

    return {
      chunk,
      index,
      totalChunks,
    };
  }

  /**
   * Attempts to reconstruct missing chunks using parity data
   * @param receivedChunks Map of received chunks by index
   * @param parityChunks Array of parity chunks
   * @param chunkMap Map of which chunks were used to create each parity chunk
   * @param totalDataChunks Total number of original data chunks
   * @returns Map of all available chunks (original + reconstructed)
   */
  reconstructChunks(
    receivedChunks: Map<number, ArrayBuffer>,
    parityChunks: ArrayBuffer[],
    chunkMap: Uint32Array,
    totalDataChunks: number
  ): Map<number, ArrayBuffer> {
    const result = new Map(receivedChunks);

    // Find missing chunks
    const missingIndices: number[] = [];
    for (let i = 0; i < totalDataChunks; i++) {
      if (!receivedChunks.has(i)) {
        missingIndices.push(i);
      }
    }

    // Nothing to reconstruct
    if (missingIndices.length === 0) {
      return result;
    }

    // Try to reconstruct missing chunks using parity data
    for (let p = 0; p < parityChunks.length && missingIndices.length > 0; p++) {
      const parityChunk = new Uint8Array(parityChunks[p]);
      const parityMap = chunkMap[totalDataChunks + p];

      // Check if we can reconstruct using this parity chunk
      // We need all but one of the chunks that were used to create this parity
      let missingCount = 0;
      let missingIndex = -1;

      for (let i = 0; i < totalDataChunks; i++) {
        // Check if this chunk was used in this parity calculation
        if ((parityMap & (1 << i)) !== 0) {
          if (!result.has(i)) {
            missingCount++;
            missingIndex = i;
          }
        }
      }

      // If exactly one chunk is missing, we can reconstruct it
      if (missingCount === 1 && missingIndex !== -1) {
        // Start with the parity chunk
        const reconstructedChunk = new Uint8Array(this.chunkSize);
        reconstructedChunk.set(parityChunk);

        // XOR with all available chunks that were part of this parity calculation
        for (let i = 0; i < totalDataChunks; i++) {
          if (
            i !== missingIndex &&
            (parityMap & (1 << i)) !== 0 &&
            result.has(i)
          ) {
            const chunk = new Uint8Array(result.get(i)!);

            for (let k = 0; k < this.chunkSize && k < chunk.length; k++) {
              reconstructedChunk[k] ^= chunk[k];
            }
          }
        }

        // Add the reconstructed chunk
        result.set(missingIndex, reconstructedChunk.buffer);

        // Remove this index from missing indices
        const idx = missingIndices.indexOf(missingIndex);
        if (idx !== -1) {
          missingIndices.splice(idx, 1);
        }
      }
    }

    return result;
  }
}

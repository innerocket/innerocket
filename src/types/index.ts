export interface Peer {
  id: string;
  name?: string;
}

export interface FileTransfer {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  sender: string;
  receiver: string;
  progress: number;
  status:
    | 'pending'
    | 'transferring'
    | 'completed'
    | 'failed'
    | 'integrity_error'
    | 'verifying';
  createdAt: number;
  checksum?: string;
  transferSpeed?: number; // Transfer speed in MB/s
  chunkSize?: number; // Current chunk size in bytes
  useFEC?: boolean; // Whether FEC is enabled for this transfer
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  checksum?: string;
  useFEC?: boolean; // Whether FEC is enabled for this file
  fecParityRatio?: number; // Ratio of parity chunks to data chunks (e.g., 0.2 = 20% extra parity data)
}

export interface FileTransferRequest {
  metadata: FileMetadata;
  from: Peer;
}

// New interface for FEC chunk metadata
export interface FECChunkMetadata {
  index: number;
  totalChunks: number;
  isParityChunk?: boolean;
  parityIndex?: number;
  totalParityChunks?: number;
  chunkMap?: Uint32Array;
  blockOffset?: number;
  blockSize?: number;
}

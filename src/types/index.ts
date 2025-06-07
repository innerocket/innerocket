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
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
  checksum?: string;
}

export interface FileTransferRequest {
  metadata: FileMetadata;
  from: Peer;
}

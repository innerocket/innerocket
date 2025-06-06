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
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  createdAt: number;
}

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  type: string;
}

export interface FileTransferRequest {
  metadata: FileMetadata;
  from: Peer;
}

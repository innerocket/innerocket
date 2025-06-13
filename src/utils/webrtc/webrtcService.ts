import { v4 as uuidv4 } from 'uuid';
import type { FileMetadata, FileTransferRequest, Peer } from '../../types';
import { ConnectionManager } from './connectionManager';
import { FileTransferService } from './fileTransferService';

export class WebRTCService {
  private connectionManager: ConnectionManager;
  private fileTransferService: FileTransferService;
  private myPeerId: string;

  constructor(peerId?: string) {
    // Use provided peerId or generate a new one if not provided
    this.myPeerId = peerId || uuidv4();

    // Initialize services
    this.connectionManager = new ConnectionManager(this.myPeerId);
    this.fileTransferService = new FileTransferService();
  }

  // Connection Management Methods
  public connectToPeer(peerId: string): void {
    this.connectionManager.connectToPeer(peerId);
  }

  public disconnectFromPeer(peerId: string): void {
    this.connectionManager.disconnectFromPeer(peerId);
  }

  public getMyPeerId(): string {
    return this.connectionManager.getMyPeerId();
  }

  public getDiscoveredPeers(): Peer[] {
    return this.connectionManager.getDiscoveredPeers();
  }

  // File Transfer Methods
  public async sendFileRequest(
    peerId: string,
    file: File
  ): Promise<FileMetadata | null> {
    const metadata = await this.fileTransferService.createFileRequest(file);
    if (!metadata) return null;

    const success = this.connectionManager.sendData(peerId, {
      type: 'file-request',
      metadata,
      name: 'Anonymous', // You can set a name here
    });

    return success ? metadata : null;
  }

  public sendFile(peerId: string, file: File, metadata: FileMetadata): void {
    const sendDataFn = (data: any) =>
      this.connectionManager.sendData(peerId, data);
    this.fileTransferService.sendFile(sendDataFn, file, metadata, peerId);
  }

  public acceptFileTransfer(peerId: string, metadata: FileMetadata): void {
    this.connectionManager.sendData(peerId, {
      type: 'file-accept',
      metadata,
    });
  }

  public rejectFileTransfer(peerId: string, metadata: FileMetadata): void {
    this.connectionManager.sendData(peerId, {
      type: 'file-reject',
      metadata,
    });
  }

  // Event Handler Setup Methods
  public setOnPeerConnected(callback: (peer: Peer) => void): void {
    this.connectionManager.setCallbacks({ onPeerConnected: callback });
  }

  public setOnPeerDisconnected(callback: (peerId: string) => void): void {
    this.connectionManager.setCallbacks({ onPeerDisconnected: callback });
  }

  public setOnFileTransferRequest(
    callback: (request: FileTransferRequest) => void
  ): void {
    this.connectionManager.setCallbacks({ onFileTransferRequest: callback });
  }

  public setOnFileChunk(
    callback: (
      peerId: string,
      chunk: ArrayBuffer,
      metadata: FileMetadata,
      progress: number,
      chunkSize?: number,
      transferSpeed?: number,
      chunkIndex?: number
    ) => void
  ): void {
    const wrappedCallback = (
      peerId: string,
      chunk: ArrayBuffer,
      metadata: any,
      progress: number,
      chunkSize?: number,
      transferSpeed?: number,
      chunkIndex?: number
    ) =>
      callback(
        peerId,
        chunk,
        metadata,
        progress,
        chunkSize,
        transferSpeed,
        chunkIndex
      );

    this.connectionManager.setCallbacks({ onFileChunk: wrappedCallback });
    this.fileTransferService.setCallbacks({ onFileChunk: wrappedCallback });
  }

  public setOnFileTransferComplete(
    callback: (peerId: string, metadata: FileMetadata) => void
  ): void {
    this.connectionManager.setCallbacks({ onFileTransferComplete: callback });
  }

  public setOnFileTransferAccepted(
    callback: (peerId: string, metadata: FileMetadata) => void
  ): void {
    this.connectionManager.setCallbacks({ onFileTransferAccepted: callback });
  }

  public setOnFileTransferRejected(
    callback: (peerId: string, metadata: FileMetadata) => void
  ): void {
    this.connectionManager.setCallbacks({ onFileTransferRejected: callback });
  }

  // Additional utility methods
  public getActiveTransfers() {
    return this.fileTransferService.getActiveTransfers();
  }

  public cancelTransfer(transferId: string): void {
    this.fileTransferService.cancelTransfer(transferId);
  }
}

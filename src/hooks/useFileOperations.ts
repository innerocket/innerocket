import { useMemo } from 'preact/hooks'
import type { FileTransfer } from '../types'
import { FileStorageService } from '../services/fileStorageService'
import {
  createFileDownload,
  createPreviewUrl,
  getFileTypeFromName,
} from '../utils/fileTransferUtils'

interface UseFileOperationsProps {
  fileTransfers: FileTransfer[]
  getReceivedFile: (fileId: string) => Blob | undefined
}

export function useFileOperations({ fileTransfers, getReceivedFile }: UseFileOperationsProps) {
  const fileStorageService = useMemo(() => new FileStorageService(), [])

  const downloadFile = async (fileId: string): Promise<void> => {
    const transfer = fileTransfers.find(t => t.id === fileId)
    if (!transfer) {
      console.error('Transfer not found:', fileId)
      return
    }

    if (transfer.status === 'integrity_error') {
      console.error('Cannot download file with integrity errors:', fileId)
      return
    }

    // Try memory first
    const fileFromMemory = getReceivedFile(fileId)
    if (fileFromMemory) {
      createFileDownload(fileFromMemory, transfer.fileName)
      return
    }

    // Fallback to storage
    try {
      const result = await fileStorageService.getFile(fileId)
      if (result) {
        createFileDownload(result.blob, result.fileName)
      } else {
        console.error('File not found:', fileId)
      }
    } catch (error) {
      console.error('Error downloading file:', error)
    }
  }

  const previewFile = async (fileId: string): Promise<string | null> => {
    try {
      // Try memory first
      const fileFromMemory = getReceivedFile(fileId)
      if (fileFromMemory) {
        return createPreviewUrl(fileFromMemory)
      }

      // Fallback to storage
      const result = await fileStorageService.getFile(fileId)
      if (result) {
        return createPreviewUrl(result.blob)
      }

      return null
    } catch (error) {
      console.error(`Error previewing file ${fileId}:`, error)
      return null
    }
  }

  const getFileType = (fileId: string): string | null => {
    const transfer = fileTransfers.find(t => t.id === fileId)
    if (transfer && transfer.fileType) {
      return transfer.fileType
    }

    const file = getReceivedFile(fileId)
    if (file) {
      return file.type
    }

    // Fallback to guess from filename
    if (transfer) {
      return getFileTypeFromName(transfer.fileName)
    }

    return 'application/octet-stream'
  }

  const getFile = async (fileId: string): Promise<{ blob: Blob; fileName: string } | null> => {
    // Try memory first
    const fileFromMemory = getReceivedFile(fileId)
    if (fileFromMemory) {
      const transfer = fileTransfers.find(t => t.id === fileId)
      return {
        blob: fileFromMemory,
        fileName: transfer?.fileName || 'unknown-file',
      }
    }

    // Fallback to storage
    return await fileStorageService.getFile(fileId)
  }

  return {
    downloadFile,
    previewFile,
    getFileType,
    getFile,
  }
}

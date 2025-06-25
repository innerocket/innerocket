import { useState, useEffect } from 'preact/hooks'
import type { FileTransfer } from '../types'

const TRANSFERS_STORAGE_KEY = 'innerocket_transfers'

export function useFileTransferState() {
  const [fileTransfers, setFileTransfers] = useState<FileTransfer[]>(() => {
    const savedTransfers = localStorage.getItem(TRANSFERS_STORAGE_KEY)
    return savedTransfers ? JSON.parse(savedTransfers) : []
  })

  const [receivedFiles, setReceivedFiles] = useState<Map<string, Blob>>(new Map())

  // Save transfers to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(fileTransfers))
  }, [fileTransfers])

  const addTransfer = (transfer: FileTransfer) => {
    setFileTransfers(prev => {
      if (prev.some(t => t.id === transfer.id)) {
        return prev
      }
      return [...prev, transfer]
    })
  }

  const updateTransfer = (transferId: string, updates: Partial<FileTransfer>) => {
    setFileTransfers(prev => prev.map(t => (t.id === transferId ? { ...t, ...updates } : t)))
  }

  const updateTransferProgress = (
    transferId: string,
    progress: number,
    status?: FileTransfer['status'],
    transferSpeed?: number,
    chunkSize?: number
  ) => {
    setFileTransfers(prev => {
      const index = prev.findIndex(t => t.id === transferId)
      if (index === -1) return prev

      const newTransfers = [...prev]
      newTransfers[index] = {
        ...newTransfers[index],
        progress,
        ...(status && { status }),
        ...(transferSpeed !== undefined && { transferSpeed }),
        ...(chunkSize !== undefined && { chunkSize }),
      }

      return newTransfers
    })
  }

  const removeTransfer = (transferId: string) => {
    setFileTransfers(prev => prev.filter(t => t.id !== transferId))
  }

  const clearAllTransfers = () => {
    setFileTransfers([])
    setReceivedFiles(new Map())
    localStorage.removeItem(TRANSFERS_STORAGE_KEY)
  }

  const addReceivedFile = (fileId: string, blob: Blob) => {
    setReceivedFiles(prev => {
      const newFiles = new Map(prev)
      newFiles.set(fileId, blob)
      return newFiles
    })
  }

  const getReceivedFile = (fileId: string): Blob | undefined => {
    return receivedFiles.get(fileId)
  }

  const getTransfer = (transferId: string): FileTransfer | undefined => {
    return fileTransfers.find(t => t.id === transferId)
  }

  return {
    fileTransfers,
    receivedFiles,
    addTransfer,
    updateTransfer,
    updateTransferProgress,
    removeTransfer,
    clearAllTransfers,
    addReceivedFile,
    getReceivedFile,
    getTransfer,
    setFileTransfers,
  }
}

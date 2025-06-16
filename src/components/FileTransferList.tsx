import type { FileTransfer } from '../types';
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  Download,
  FolderOpen,
} from 'lucide-react';
import { Badge, Button, Input, getStatusBadgeVariant, EmptyState } from './ui';
import { usePeer } from '../contexts/PeerContext';
import { useState } from 'preact/hooks';
import { getFileTypeConfig } from '../utils/fileTypeUtils';

interface FileTransferListProps {
  transfers: FileTransfer[];
  onDownload: (fileId: string) => void;
  onPreview: (fileId: string) => void;
}

export function FileTransferList({
  transfers,
  onDownload,
  onPreview,
}: FileTransferListProps) {
  const { peerId } = usePeer();
  const [searchQuery, setSearchQuery] = useState('');
  if (transfers.length === 0) {
    return (
      <EmptyState
        icon={
          <FolderOpen className="w-6 h-6 text-gray-500 dark:text-gray-400" />
        }
        title="No file transfers yet"
        subtitle="Connect to peers and start sharing files"
      />
    );
  }

  // Sort transfers with completed at the top and most recent first
  const sortedTransfers = [...transfers].sort((a, b) => {
    // First sort by status (completed first)
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (a.status !== 'completed' && b.status === 'completed') return 1;

    // Then sort by date (newest first)
    return b.createdAt - a.createdAt;
  });

  const filteredTransfers = sortedTransfers.filter((transfer) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const dateString = new Date(transfer.createdAt)
      .toLocaleString()
      .toLowerCase();
    return (
      transfer.fileName.toLowerCase().includes(query) ||
      dateString.includes(query)
    );
  });

  return (
    <div>
      <Input
        type="text"
        placeholder="Search by file name or date"
        value={searchQuery}
        onInput={(e) => setSearchQuery((e.target as HTMLInputElement).value)}
        className="mb-4"
        fullWidth
      />
      <div className="relative overflow-x-auto rounded-lg border-2 border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:text-gray-300 border-b-2 border-gray-200 dark:border-gray-600 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">
                File
              </th>
              <th scope="col" className="px-6 py-4 font-semibold">
                Size
              </th>
              <th scope="col" className="px-6 py-4 font-semibold">
                Direction
              </th>
              <th scope="col" className="px-6 py-4 font-semibold">
                Status
              </th>
              <th scope="col" className="px-6 py-4 font-semibold">
                Progress
              </th>
              <th scope="col" className="px-6 py-4 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-600">
            {filteredTransfers.map((transfer) => (
              <tr
                key={transfer.id}
                className="transition-all duration-200 bg-white dark:bg-gray-800"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const fileTypeConfig = getFileTypeConfig(
                        transfer.fileName
                      );
                      const Icon = fileTypeConfig.icon;
                      return (
                        <div
                          className={`w-10 h-10 rounded-md flex items-center justify-center ${fileTypeConfig.backgroundColor}`}
                        >
                          <Icon
                            className={`w-5 h-5 ${fileTypeConfig.textColor}`}
                          />
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                        {transfer.fileName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {transfer.fileType || 'Unknown type'}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(transfer.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {formatFileSize(transfer.fileSize)}
                  </div>
                  {transfer.chunkSize && transfer.status === 'transferring' && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Chunk: {formatFileSize(transfer.chunkSize)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transfer.sender === 'unknown' ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Received
                    </span>
                  ) : transfer.sender !== transfer.receiver ? (
                    transfer.sender === peerId ? (
                      <span className="flex items-center text-blue-600 dark:text-blue-500">
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Sent
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600 dark:text-green-500">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Received
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      -
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Badge
                    variant={getStatusBadgeVariant(transfer.status)}
                    label={transfer.status}
                    rounded
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="w-full bg-gray-200 rounded-lg h-3 dark:bg-gray-600 overflow-hidden">
                    <div
                      className={`h-3 rounded-lg transition-all duration-300 ${
                        transfer.status === 'completed'
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : transfer.status === 'failed' ||
                            transfer.status === 'integrity_error'
                          ? 'bg-gradient-to-r from-red-500 to-red-600'
                          : transfer.status === 'verifying'
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500'
                          : 'bg-gradient-to-r from-blue-500 to-blue-600'
                      }`}
                      style={{ width: `${transfer.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 font-medium">
                    {transfer.progress}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {transfer.status === 'completed' && (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => onPreview(transfer.id)}
                        size="sm"
                        icon={<Eye size={16} />}
                      >
                        Preview
                      </Button>
                      <Button
                        onClick={() => onDownload(transfer.id)}
                        size="sm"
                        icon={<Download size={16} />}
                      >
                        Download
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

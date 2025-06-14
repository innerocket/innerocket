import type { FileTransfer } from '../types';
import { ChevronRight, ChevronLeft, Eye, Download } from 'lucide-react';
import { Badge, Button, Input, getStatusBadgeVariant } from './ui';
import { usePeer } from '../contexts/PeerContext';
import { useState } from 'preact/hooks';

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
      <div className="p-4 mb-4 text-sm text-gray-500 rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-700 dark:border-gray-700 dark:text-gray-300">
        No file transfers yet.
      </div>
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
      <div className="relative overflow-x-auto sm:rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">
                File
              </th>
              <th scope="col" className="px-6 py-3">
                Size
              </th>
              <th scope="col" className="px-6 py-3">
                Direction
              </th>
              <th scope="col" className="px-6 py-3">
                Status
              </th>
              <th scope="col" className="px-6 py-3">
                Progress
              </th>
              <th scope="col" className="px-6 py-3">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.map((transfer) => (
              <tr
                key={transfer.id}
                className={`border-b border-gray-200 ${
                  transfer.status === 'completed'
                    ? 'bg-gray-50 dark:bg-gray-800 dark:border-gray-700'
                    : 'bg-white dark:bg-gray-800 dark:border-gray-700'
                }`}
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                    {transfer.fileName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {transfer.fileType || 'Unknown type'}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {new Date(transfer.createdAt).toLocaleString()}
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
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className={`h-2.5 rounded-full ${
                        transfer.status === 'completed'
                          ? 'bg-green-600 dark:bg-green-500'
                          : transfer.status === 'failed' ||
                            transfer.status === 'integrity_error'
                          ? 'bg-red-600 dark:bg-red-500'
                          : transfer.status === 'verifying'
                          ? 'bg-yellow-600 dark:bg-yellow-500'
                          : 'bg-blue-600 dark:bg-blue-500'
                      }`}
                      style={{ width: `${transfer.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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

import type { FileTransfer } from '../types';
import { ChevronRight, ChevronLeft, Eye } from 'lucide-react';
import { Card, Badge, Button, getStatusBadgeVariant } from './ui';

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
  if (transfers.length === 0) {
    return (
      <Card title="File Transfers">
        <p className="text-gray-500 text-sm">No file transfers yet.</p>
      </Card>
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

  return (
    <Card title="File Transfers">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                File
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Size
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Direction
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Progress
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTransfers.map((transfer) => (
              <tr
                key={transfer.id}
                className={transfer.status === 'completed' ? 'bg-gray-50' : ''}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {transfer.fileName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {transfer.fileType || 'Unknown type'}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(transfer.createdAt).toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatFileSize(transfer.fileSize)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {transfer.sender === 'unknown' ? (
                    <span className="text-sm text-gray-500">Received</span>
                  ) : transfer.sender !== transfer.receiver ? (
                    transfer.sender === window.location.hostname ? (
                      <span className="flex items-center text-blue-600">
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Sent
                      </span>
                    ) : (
                      <span className="flex items-center text-green-600">
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Received
                      </span>
                    )
                  ) : (
                    <span className="text-sm text-gray-500">-</span>
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
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        transfer.status === 'completed'
                          ? 'bg-green-600'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${transfer.progress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {transfer.progress}%
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {transfer.status === 'completed' && (
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => onPreview(transfer.id)}
                        variant="info"
                        size="sm"
                        icon={<Eye size={16} />}
                      >
                        Preview
                      </Button>
                      <Button onClick={() => onDownload(transfer.id)} size="sm">
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
    </Card>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

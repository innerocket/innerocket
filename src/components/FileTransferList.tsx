import type { FileTransfer } from '../types';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface FileTransferListProps {
  transfers: FileTransfer[];
  onDownload: (fileId: string) => void;
}

export function FileTransferList({
  transfers,
  onDownload,
}: FileTransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">File Transfers</h2>
        <p className="text-gray-500 text-sm">No file transfers yet.</p>
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

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">File Transfers</h2>
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
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                      transfer.status
                    )}`}
                  >
                    {transfer.status}
                  </span>
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
                    <button
                      onClick={() => onDownload(transfer.id)}
                      className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-md hover:bg-indigo-200 transition-colors"
                    >
                      Download
                    </button>
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

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'transferring':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

import type { FileTransferRequest } from '../types';

interface FileRequestsProps {
  requests: FileTransferRequest[];
  onAccept: (request: FileTransferRequest) => void;
  onReject: (request: FileTransferRequest) => void;
}

export function FileRequests({
  requests,
  onAccept,
  onReject,
}: FileRequestsProps) {
  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Incoming File Requests
      </h2>
      <ul className="divide-y divide-gray-200">
        {requests.map((request) => (
          <li key={request.metadata.id} className="py-4">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {request.metadata.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Size: {formatFileSize(request.metadata.size)}
                </p>
                <p className="text-sm text-gray-500">
                  From: {request.from.name || request.from.id}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onAccept(request)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => onReject(request)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
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

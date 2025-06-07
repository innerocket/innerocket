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
    <div className="w-full p-4 mb-4 bg-white border border-gray-200 rounded-lg sm:p-6 dark:bg-gray-800 dark:border-gray-700">
      <h5 className="mb-3 text-base font-semibold text-gray-900 md:text-xl dark:text-white">
        Incoming File Requests
      </h5>
      <ul className="my-4 space-y-3">
        {requests.map((request) => (
          <li key={request.metadata.id}>
            <div className="p-3 bg-gray-50 rounded-lg dark:bg-gray-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-2 md:mb-0">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {request.metadata.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Size: {formatFileSize(request.metadata.size)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    From: {request.from.name || request.from.id}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onAccept(request)}
                    type="button"
                    className="text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:outline-none focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onReject(request)}
                    type="button"
                    className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:outline-none focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
                  >
                    Reject
                  </button>
                </div>
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

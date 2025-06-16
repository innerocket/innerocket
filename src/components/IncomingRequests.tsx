import type { FileTransferRequest } from '../types';
import { Button } from './ui';

interface IncomingRequestsProps {
  requests: FileTransferRequest[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
}

export function IncomingRequests({
  requests,
  onAccept,
  onReject,
}: IncomingRequestsProps) {
  if (requests.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {requests.map((req) => (
        <div
          key={req.metadata.id}
          className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700 p-4 rounded-md shadow"
        >
          <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
            Incoming file:{' '}
            <span className="font-medium">{req.metadata.name}</span> (
            {formatFileSize(req.metadata.size)})
          </p>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="danger"
              onClick={() => onReject(req.metadata.id)}
            >
              Reject
            </Button>
            <Button size="sm" onClick={() => onAccept(req.metadata.id)}>
              Accept
            </Button>
          </div>
        </div>
      ))}
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

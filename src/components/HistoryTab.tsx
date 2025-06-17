import { useState } from 'preact/hooks';
import { FileTransferList } from './FileTransferList';
import { Button } from './ui';
import { Trash2 } from 'lucide-react';
import type { FileTransfer } from '../types';

interface HistoryTabProps {
  transfers: FileTransfer[];
  onDownload: (fileId: string) => void;
  onPreview: (fileId: string) => void;
  onClearHistory: () => void;
}

export function HistoryTab({ transfers, onDownload, onPreview, onClearHistory }: HistoryTabProps) {
  const [showAll, setShowAll] = useState(false);
  
  // Sort transfers by creation date (newest first) and limit to 5 if not showing all
  const sortedTransfers = [...transfers].sort((a, b) => b.createdAt - a.createdAt);
  const displayedTransfers = showAll ? sortedTransfers : sortedTransfers.slice(0, 5);
  const hasMoreTransfers = sortedTransfers.length > 5;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            File Transfer History
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track your file transfers and downloads
          </p>
        </div>
        {transfers.length > 0 && (
          <Button
            onClick={onClearHistory}
            variant="secondary"
            size="sm"
            className="text-red-600 border-red-500 hover:bg-red-600 hover:text-white dark:text-red-400 dark:border-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        )}
      </div>

      <FileTransferList
        transfers={displayedTransfers}
        onDownload={onDownload}
        onPreview={onPreview}
      />

      {hasMoreTransfers && !showAll && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => setShowAll(true)}
            variant="secondary"
            size="sm"
          >
            Show All ({sortedTransfers.length} total)
          </Button>
        </div>
      )}

      {showAll && hasMoreTransfers && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => setShowAll(false)}
            variant="secondary"
            size="sm"
          >
            Show Less
          </Button>
        </div>
      )}
    </div>
  );
}
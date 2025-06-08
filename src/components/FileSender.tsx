import { useRef, useState } from 'preact/hooks';
import { CloudUpload, X, Users } from 'lucide-react';
import { Button } from './ui';

interface FileSenderProps {
  currentPeerId: string | null;
  onSendFile: (file: File) => void;
  onSendFileToAll?: (file: File) => void;
  connectedPeersCount?: number;
  onClose?: () => void;
}

export function FileSender({
  currentPeerId,
  onSendFile,
  onSendFileToAll,
  connectedPeersCount = 0,
  onClose,
}: FileSenderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      setSelectedFile(input.files[0]);
    }
  };

  const handleSendFile = () => {
    if (selectedFile) {
      onSendFile(selectedFile);
      setSelectedFile(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSendFileToAll = () => {
    if (selectedFile && onSendFileToAll) {
      onSendFileToAll(selectedFile);
      setSelectedFile(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  if (!currentPeerId) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
      <div className="container mx-auto max-w-4xl p-4 relative">
        {onClose && (
          <button
            onClick={onClose}
            type="button"
            className="absolute top-4 right-4 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
            <span className="sr-only">Close</span>
          </button>
        )}
        <div className="flex items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            id="file-input"
          />
          <label
            htmlFor="file-input"
            className={`flex-1 flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                : 'border-gray-200 bg-gray-50 dark:hover:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500 dark:bg-gray-700'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <CloudUpload
                className={`w-10 h-10 mb-3 ${
                  isDragging
                    ? 'text-blue-500 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-400'
                }`}
              />
              {selectedFile ? (
                <div className="text-center">
                  <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(selectedFile.size)} •{' '}
                    {selectedFile.type || 'Unknown type'}
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-1 text-sm font-semibold text-gray-900 dark:text-white">
                    {isDragging ? 'Drop file here' : 'Select a file to send'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Click or drag and drop
                  </p>
                </div>
              )}
            </div>
          </label>
          <div className="flex mt-auto flex-col gap-2">
            <Button
              onClick={handleSendFile}
              disabled={!selectedFile || (!currentPeerId && !onSendFileToAll)}
              className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
            >
              Send File
            </Button>

            {onSendFileToAll && connectedPeersCount > 0 && (
              <Button
                onClick={handleSendFileToAll}
                disabled={!selectedFile}
                className="flex items-center gap-2 text-white bg-green-600 hover:bg-green-700 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-green-600 dark:hover:bg-green-700 focus:outline-none dark:focus:ring-green-800"
              >
                <Users size={16} />
                Send to All ({connectedPeersCount})
              </Button>
            )}
          </div>
        </div>
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

import { useRef, useState } from 'preact/hooks';
import { CloudUpload } from 'lucide-react';
import { Button, Card } from './ui';

interface FileSenderProps {
  currentPeerId: string | null;
  onSendFile: (file: File) => void;
}

export function FileSender({ currentPeerId, onSendFile }: FileSenderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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

  if (!currentPeerId) {
    return null;
  }

  return (
    <Card className="fixed bottom-0 left-0 right-0 border-t border-gray-200">
      <div className="container mx-auto max-w-4xl flex items-center">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          id="file-input"
        />
        <label
          htmlFor="file-input"
          className="cursor-pointer flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-500 transition-colors"
        >
          <div className="flex flex-col items-center justify-center text-center">
            <CloudUpload className="h-8 w-8 text-gray-400 mb-2" />
            {selectedFile ? (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)} •{' '}
                  {selectedFile.type || 'Unknown type'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Select a file to send
                </p>
                <p className="text-xs text-gray-500">Click or drag and drop</p>
              </div>
            )}
          </div>
        </label>
        <Button
          onClick={handleSendFile}
          disabled={!selectedFile}
          className="ml-4"
          size="lg"
        >
          Send File
        </Button>
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

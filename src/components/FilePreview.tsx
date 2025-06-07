import { useEffect, useState } from 'preact/hooks';
import { X } from 'lucide-react';

interface FilePreviewProps {
  fileName: string;
  fileType: string;
  previewUrl: string | null;
  onClose: () => void;
}

export function FilePreview({
  fileName,
  fileType,
  previewUrl,
  onClose,
}: FilePreviewProps) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // When previewUrl changes, reset loading state
    if (previewUrl) {
      setIsLoading(false);
    }
  }, [previewUrl]);

  if (!previewUrl) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">{fileName}</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500">Unable to preview this file.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 truncate">
            {fileName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          )}

          {fileType.startsWith('image/') && (
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              onLoad={() => setIsLoading(false)}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {fileType.startsWith('video/') && (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full"
              onLoadedData={() => setIsLoading(false)}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {fileType.startsWith('audio/') && (
            <audio
              src={previewUrl}
              controls
              className="w-full"
              onLoadedData={() => setIsLoading(false)}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {fileType === 'application/pdf' && (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              onLoad={() => setIsLoading(false)}
              style={{
                display: isLoading ? 'none' : 'block',
                minHeight: '70vh',
              }}
            />
          )}

          {!fileType.startsWith('image/') &&
            !fileType.startsWith('video/') &&
            !fileType.startsWith('audio/') &&
            fileType !== 'application/pdf' && (
              <div className="text-center p-8">
                <div className="bg-gray-100 rounded-lg p-6 inline-block mb-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-gray-400 mx-auto"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-gray-600 mb-2">
                  Preview not available for this file type.
                </p>
                <p className="text-gray-500 text-sm">
                  {fileType || 'Unknown type'}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

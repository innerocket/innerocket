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
      <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-50 p-4 overflow-x-hidden overflow-y-auto dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-lg dark:bg-gray-800">
          <div className="flex items-center justify-between p-4 border-b rounded-t dark:border-gray-600">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {fileName}
            </h3>
            <button
              onClick={onClose}
              type="button"
              className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
            >
              <X size={20} />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6">
            <p className="text-gray-500 dark:text-gray-400">
              Unable to preview this file.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/75 flex items-center justify-center z-50 p-4 overflow-x-hidden overflow-y-auto dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-lg dark:bg-gray-800">
        <div className="flex items-center justify-between p-4 border-b rounded-t border-gray-200 dark:border-gray-600">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white truncate">
            {fileName}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center dark:hover:bg-gray-600 dark:hover:text-white"
          >
            <X size={20} />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-blue-600 motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-blue-500"></div>
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
                <div className="bg-gray-100 rounded-lg p-6 inline-block mb-4 dark:bg-gray-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-16 w-16 text-gray-400 mx-auto dark:text-gray-300"
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
                <p className="mb-2 text-gray-600 dark:text-gray-300">
                  Preview not available for this file type.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {fileType || 'Unknown type'}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

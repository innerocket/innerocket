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
  const [error, setError] = useState<string | null>(null);
  const [actualFileType, setActualFileType] = useState<string>(fileType);
  const [videoPlaybackAttempted, setVideoPlaybackAttempted] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setVideoPlaybackAttempted(false);

    // When previewUrl changes, reset loading state
    if (previewUrl) {
      console.log(`FilePreview: Loading preview for ${fileName} (${fileType})`);

      // Detect the actual file type from the blob if possible
      fetch(previewUrl)
        .then((response) => response.blob())
        .then((blob) => {
          console.log(
            `Preview blob type: ${blob.type}, size: ${blob.size} bytes`
          );

          // For video files, we may need to detect type from filename if MIME type is generic
          let detectedType = blob.type;

          // If the type is generic or empty but filename suggests it's a video
          if (
            (detectedType === 'application/octet-stream' || !detectedType) &&
            fileName.toLowerCase().match(/\.(mp4|webm|ogg|mov|avi)$/)
          ) {
            const ext = fileName.split('.').pop()?.toLowerCase();
            if (ext === 'mp4') detectedType = 'video/mp4';
            else if (ext === 'webm') detectedType = 'video/webm';
            else if (ext === 'ogg') detectedType = 'video/ogg';
            else if (ext === 'mov') detectedType = 'video/quicktime';
            else if (ext === 'avi') detectedType = 'video/x-msvideo';

            console.log(`Detected video type from filename: ${detectedType}`);
          }

          if (detectedType && detectedType !== 'application/octet-stream') {
            setActualFileType(detectedType);
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Error fetching preview blob:', err);
          setError('Failed to load preview data');
          setIsLoading(false);
        });
    }
  }, [previewUrl, fileName]);

  // Function to handle video loading errors
  const handleVideoError = (e: any) => {
    console.error('Video error:', e);
    if (!videoPlaybackAttempted) {
      // Try with a different MIME type on first error
      setVideoPlaybackAttempted(true);

      // If we initially tried with detected type, try with a generic video type
      if (actualFileType !== 'video/mp4') {
        console.log('Retrying video with video/mp4 type');
        setActualFileType('video/mp4');
      } else {
        setError('Unable to play this video. Try downloading it instead.');
      }
    } else {
      setError('Unable to play this video. Try downloading it instead.');
    }
  };

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

          {error && !isLoading && (
            <div className="text-center p-8">
              <p className="text-red-500 mb-2">{error}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Try downloading the file instead.
              </p>
            </div>
          )}

          {!isLoading && !error && actualFileType.startsWith('image/') && (
            <img
              src={previewUrl}
              alt={fileName}
              className="max-w-full max-h-full object-contain"
              onError={() => setError('Failed to load image')}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {!isLoading && !error && actualFileType.startsWith('video/') && (
            <video
              src={previewUrl}
              controls
              className="max-w-full max-h-full"
              onError={handleVideoError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {!isLoading && !error && actualFileType.startsWith('audio/') && (
            <audio
              src={previewUrl}
              controls
              className="w-full"
              onError={() => setError('Failed to load audio')}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
          )}

          {!isLoading && !error && actualFileType === 'application/pdf' && (
            <iframe
              src={previewUrl}
              className="w-full h-full"
              onError={() => setError('Failed to load PDF')}
              style={{
                display: isLoading ? 'none' : 'block',
                minHeight: '70vh',
              }}
            />
          )}

          {!isLoading &&
            !error &&
            !actualFileType.startsWith('image/') &&
            !actualFileType.startsWith('video/') &&
            !actualFileType.startsWith('audio/') &&
            actualFileType !== 'application/pdf' && (
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
                  {actualFileType || 'Unknown type'}
                </p>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

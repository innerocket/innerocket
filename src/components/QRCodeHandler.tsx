import { useState, useEffect } from 'preact/hooks';
import QRCode from 'qrcode';
import { QrReader } from 'react-qr-reader';
import Sqlds from 'sqids';
import { Button } from './ui';

const sqlds = new Sqlds();

type QRCodeHandlerProps = {
  initialValue?: string;
  onScan?: (data: string) => void;
  mode?: 'generate' | 'scan' | 'both';
  readOnly?: boolean;
  onValidScan?: () => void; // Callback to close modal when valid scan is detected
};

export function QRCodeHandler({
  initialValue = '',
  onScan,
  mode = 'both',
  readOnly = false,
  onValidScan,
}: QRCodeHandlerProps) {
  const [qrValue, setQrValue] = useState<string>(
    initialValue ||
      sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])
  );
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(
    mode === 'scan'
  );
  const [scanResult, setScanResult] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Generate QR code when value changes
  useEffect(() => {
    if (qrValue) {
      QRCode.toDataURL(qrValue, {
        width: 300,
        margin: 2,
      })
        .then((url) => {
          setQrCodeDataURL(url);
        })
        .catch((err) => {
          console.error('Error generating QR code:', err);
        });
    }
  }, [qrValue]);

  // Generate new ID
  const generateNewUUID = () => {
    const newID = sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)]);
    setQrValue(newID);
    return newID;
  };

  // Validate QR code format (basic peer ID validation)
  const isValidPeerIdFormat = (text: string): boolean => {
    // Basic validation - should be a non-empty string with reasonable length
    return !!(text && text.trim().length > 0 && text.trim().length < 100);
  };

  // Handle scan result
  const handleScan = (result: any) => {
    if (result?.text) {
      const scannedText = result.text.trim();
      setScanResult(scannedText);
      setIsScanning(false);

      if (onScan) {
        onScan(scannedText);
      }

      // If it's a valid format and we're in scan mode, auto-close
      if (mode === 'scan' && isValidPeerIdFormat(scannedText) && onValidScan) {
        // Small delay to show the result briefly before closing
        setTimeout(() => {
          onValidScan();
        }, 500);
      }
    }
  };

  const toggleScanner = () => {
    setIsScannerActive((prev) => !prev);
  };

  const startScanner = () => {
    setIsScannerActive(true);
  };

  return (
    <div className="qr-code-handler space-y-6">
      {(mode === 'generate' || mode === 'both') && (
        <div className="qr-generator">
          {!readOnly && (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Value
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={qrValue}
                  onChange={(e) =>
                    setQrValue((e.target as HTMLInputElement).value)
                  }
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
                />
                <Button onClick={generateNewUUID} variant="primary">
                  Generate ID
                </Button>
              </div>
            </div>
          )}

          {qrCodeDataURL && (
            <div className="qr-display flex flex-col items-center">
              <img
                src={qrCodeDataURL}
                alt="QR Code"
                className="select-none pointer-events-none"
              />
            </div>
          )}
        </div>
      )}

      {(mode === 'scan' || mode === 'both') && (
        <div className="qr-scanner">
          <div className="w-full bg-white dark:bg-gray-800">
            {mode !== 'scan' && (
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  QR Code Scanner
                </h3>
                <Button
                  onClick={isScannerActive ? toggleScanner : startScanner}
                  variant={isScannerActive ? 'danger' : 'success'}
                  size="sm"
                  disabled={isScanning}
                >
                  {isScannerActive ? 'Stop Scanner' : 'Start Scanner'}
                </Button>
              </div>
            )}

            {isScannerActive && (
              <div className="scanner-container mb-4 overflow-hidden">
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={handleScan}
                  scanDelay={500}
                  className="w-full max-w-sm mx-auto"
                />
              </div>
            )}

            {scanResult && (
              <div className="p-4 bg-gray-50 dark:bg-gray-700">
                <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Scan Result:
                </h4>
                <p className="text-sm break-all text-gray-700 dark:text-gray-300">
                  {scanResult}
                </p>
                {mode === 'scan' && isValidPeerIdFormat(scanResult) && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                    ✓ Valid format detected - closing scanner...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'preact/hooks';
import QRCode from 'qrcode';
import { QrReader } from 'react-qr-reader';
import { v4 as uuidv4 } from 'uuid';
import { Button } from './ui';

type QRCodeHandlerProps = {
  initialValue?: string;
  onScan?: (data: string) => void;
  mode?: 'generate' | 'scan' | 'both';
  readOnly?: boolean;
};

export function QRCodeHandler({
  initialValue = '',
  onScan,
  mode = 'both',
  readOnly = false,
}: QRCodeHandlerProps) {
  const [qrValue, setQrValue] = useState<string>(initialValue || uuidv4());
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<string>('');

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

  // Generate new UUID
  const generateNewUUID = () => {
    const newUUID = uuidv4();
    setQrValue(newUUID);
    return newUUID;
  };

  // Handle scan result
  const handleScan = (result: any) => {
    if (result?.text) {
      setScanResult(result.text);
      if (onScan) {
        onScan(result.text);
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
                  Generate UUID
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
          <div className="w-full p-4 bg-white border border-gray-200 rounded-md dark:bg-gray-800 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                QR Code Scanner
              </h3>
              <Button
                onClick={isScannerActive ? toggleScanner : startScanner}
                variant={isScannerActive ? 'danger' : 'success'}
                size="sm"
              >
                {isScannerActive ? 'Stop Scanner' : 'Start Scanner'}
              </Button>
            </div>

            {isScannerActive && (
              <div className="scanner-container mb-4 border border-gray-300 rounded-md overflow-hidden dark:border-gray-600">
                <QrReader
                  constraints={{ facingMode: 'environment' }}
                  onResult={handleScan}
                  scanDelay={500}
                  className="w-full max-w-sm mx-auto"
                />
              </div>
            )}

            {scanResult && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md dark:bg-gray-700 dark:border-gray-600">
                <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  Scan Result:
                </h4>
                <p className="text-sm break-all text-gray-700 dark:text-gray-300">
                  {scanResult}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

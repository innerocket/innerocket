import { useState, useEffect } from 'preact/hooks';
import QRCode from 'qrcode';
import { QrReader } from 'react-qr-reader';
import { v4 as uuidv4 } from 'uuid';

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

  return (
    <div className="qr-code-handler">
      {(mode === 'generate' || mode === 'both') && (
        <div className="qr-generator mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            QR Code Generator
          </h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <div className="flex">
              <input
                type="text"
                value={qrValue}
                onChange={(e) =>
                  !readOnly && setQrValue((e.target as HTMLInputElement).value)
                }
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                readOnly={readOnly}
              />
              {!readOnly && (
                <button
                  onClick={generateNewUUID}
                  className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Generate UUID
                </button>
              )}
            </div>
          </div>

          {qrCodeDataURL && (
            <div className="qr-display mt-4 flex flex-col items-center">
              <img
                src={qrCodeDataURL}
                alt="QR Code"
                className="border border-gray-200 rounded-md shadow-sm"
              />
              <p className="mt-2 text-sm text-gray-500 break-all max-w-full">
                {qrValue}
              </p>
            </div>
          )}
        </div>
      )}

      {(mode === 'scan' || mode === 'both') && (
        <div className="qr-scanner mt-8">
          <h3 className="text-lg font-medium text-gray-800 mb-3">
            QR Code Scanner
          </h3>

          <button
            onClick={toggleScanner}
            className="mb-4 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            {isScannerActive ? 'Stop Scanner' : 'Start Scanner'}
          </button>

          {isScannerActive && (
            <div className="scanner-container border border-gray-300 rounded-md overflow-hidden">
              <QrReader
                constraints={{ facingMode: 'environment' }}
                onResult={handleScan}
                scanDelay={500}
                className="w-full max-w-sm mx-auto"
              />
            </div>
          )}

          {scanResult && (
            <div className="scan-result mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="text-sm font-medium text-gray-700">
                Scan Result:
              </h4>
              <p className="text-sm break-all mt-1">{scanResult}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

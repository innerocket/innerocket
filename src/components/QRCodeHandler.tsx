import { createSignal, createEffect, on, Show, onCleanup, type Component } from 'solid-js'
import QRCode from 'qrcode'
import QrScanner from 'qr-scanner'
import Sqlds from 'sqids'
import { Button } from './ui'

const sqlds = new Sqlds()

type QRCodeHandlerProps = {
  initialValue?: string
  onScan?: (data: string) => void
  mode?: 'generate' | 'scan' | 'both'
  readOnly?: boolean
  onValidScan?: () => void // Callback to close modal when valid scan is detected
}

export const QRCodeHandler: Component<QRCodeHandlerProps> = props => {
  const [qrValue, setQrValue] = createSignal<string>(
    props.initialValue || sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])
  )
  const [qrCodeDataURL, setQrCodeDataURL] = createSignal<string>('')
  const [isScannerActive, setIsScannerActive] = createSignal(props.mode === 'scan')
  const [scanResult, setScanResult] = createSignal<string>('')
  const [isScanning, setIsScanning] = createSignal(false)
  const [scannerError, setScannerError] = createSignal<string>('')
  let videoRef: HTMLVideoElement | undefined
  let qrScanner: QrScanner | undefined

  // Generate QR code when value changes
  createEffect(
    on(qrValue, () => {
      if (qrValue()) {
        QRCode.toDataURL(qrValue(), {
          width: 300,
          margin: 2,
        })
          .then(url => {
            setQrCodeDataURL(url)
          })
          .catch(err => {
            console.error('Error generating QR code:', err)
          })
      }
    })
  )

  // Initialize and clean up QR scanner
  createEffect(
    on(isScannerActive, active => {
      if (active && videoRef) {
        setScannerError('')
        qrScanner = new QrScanner(
          videoRef,
          (result) => {
            const scannedText = result.data.trim()
            setScanResult(scannedText)
            setIsScanning(false)
            if (props.onScan) {
              props.onScan(scannedText)
            }
            if (props.mode === 'scan' && isValidPeerIdFormat(scannedText) && props.onValidScan) {
              setTimeout(() => {
                props.onValidScan!()
              }, 500)
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: false,
            highlightCodeOutline: false,
          }
        )
        qrScanner
          .start()
          .then(() => setIsScanning(true))
          .catch((err: unknown) => {
            console.error('Failed to start QR scanner:', err)
            let errorMessage = 'Failed to start camera'
            if (err instanceof Error) {
              if (err.name === 'NotAllowedError') {
                errorMessage = 'Camera access denied. Please allow camera access and try again.'
              } else if (err.name === 'NotFoundError') {
                errorMessage = 'No camera found. Please connect a camera and try again.'
              } else if (err.name === 'NotSupportedError') {
                errorMessage = 'Camera not supported by this browser.'
              }
            }
            setScannerError(errorMessage)
            setIsScannerActive(false)
          })
      } else {
        if (qrScanner) {
          qrScanner.stop()
          qrScanner.destroy()
          qrScanner = undefined
          setIsScanning(false)
        }
      }
    })
  )

  // Cleanup on component unmount
  onCleanup(() => {
    if (qrScanner) {
      qrScanner.stop()
      qrScanner.destroy()
    }
  })

  // Generate new ID
  const generateNewUUID = () => {
    const newID = sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])
    setQrValue(newID)
    return newID
  }

  // Validate QR code format (basic peer ID validation)
  const isValidPeerIdFormat = (text: string): boolean => {
    return !!(text && text.trim().length > 0 && text.trim().length < 100)
  }

  const toggleScanner = () => {
    setIsScannerActive(prev => !prev)
  }

  const startScanner = () => {
    setIsScannerActive(true)
  }

  return (
    <div class='qr-code-handler space-y-6'>
      <Show when={props.mode === 'generate' || props.mode === 'both'}>
        <div class='qr-generator'>
          <Show when={!props.readOnly}>
            <div class='mb-4'>
              <label class='block mb-2 text-sm font-medium text-gray-900 dark:text-white'>
                Value
              </label>
              <div class='flex gap-3'>
                <input
                  type='text'
                  value={qrValue()}
                  onInput={e => setQrValue(e.currentTarget.value)}
                  class='bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-md focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
                />
                <Button onClick={generateNewUUID} variant='primary'>
                  Generate ID
                </Button>
              </div>
            </div>
          </Show>

          <Show when={qrCodeDataURL()}>
            <div class='qr-display flex flex-col items-center'>
              <img src={qrCodeDataURL()} alt='QR Code' class='select-none pointer-events-none' />
            </div>
          </Show>
        </div>
      </Show>

      <Show when={props.mode === 'scan' || props.mode === 'both'}>
        <div class='qr-scanner'>
          <div class='w-full bg-white dark:bg-gray-800'>
            <Show when={props.mode !== 'scan'}>
              <div class='flex items-center justify-between mb-4'>
                <h3 class='text-xl font-bold text-gray-900 dark:text-white'>QR Code Scanner</h3>
                <Button
                  onClick={isScannerActive() ? toggleScanner : startScanner}
                  variant={isScannerActive() ? 'danger' : 'success'}
                  size='sm'
                  disabled={isScanning()}
                >
                  {isScannerActive() ? 'Stop Scanner' : 'Start Scanner'}
                </Button>
              </div>
            </Show>

            <Show when={isScannerActive()}>
              <div class='scanner-container mb-4 overflow-hidden'>
                <div class='mx-auto max-w-sm'>
                  <video ref={videoRef} class='w-full rounded-lg border-2 border-gray-300 dark:border-gray-600'></video>
                </div>
                <p class='text-xs text-gray-500 dark:text-gray-400 text-center mt-2'>
                  Point your camera at a QR code to scan
                </p>
              </div>
            </Show>

            <Show when={scannerError()}>
              <div class='p-4 bg-red-50 border border-red-200 rounded-lg mb-4 dark:bg-red-900/20 dark:border-red-700'>
                <p class='text-sm text-red-600 dark:text-red-400'>{scannerError()}</p>
              </div>
            </Show>

            <Show when={scanResult()}>
              <div class='p-4 bg-gray-50 dark:bg-gray-700'>
                <h4 class='mb-2 text-sm font-medium text-gray-900 dark:text-white'>Scan Result:</h4>
                <p class='text-sm break-all text-gray-700 dark:text-gray-300'>{scanResult()}</p>
                <Show when={props.mode === 'scan' && isValidPeerIdFormat(scanResult())}>
                  <p class='text-sm text-green-600 dark:text-green-400 mt-2'>
                    ✓ Valid format detected - closing scanner...
                  </p>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

import { X } from 'lucide-preact'
import { QRCodeHandler } from './QRCodeHandler'
import { IconButton } from './ui'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  value?: string
  title?: string
  mode?: 'generate' | 'scan'
  onScan?: (data: string) => void
}

export function QRCodeModal({
  isOpen,
  onClose,
  value,
  title = 'QR Code',
  mode = 'generate',
  onScan,
}: QRCodeModalProps) {
  if (!isOpen) return null
  if (mode === 'generate' && !value) return null

  return (
    <div className='fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex justify-center items-center z-50 p-4'>
      <div className='relative bg-white rounded-xl border-2 border-gray-200 dark:bg-gray-800 dark:border-gray-700 max-w-sm w-full'>
        {/* Header */}
        <div className='p-6 bg-gray-50 border-b-2 border-gray-200 rounded-t-xl dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h3>
          <IconButton
            onClick={onClose}
            variant='ghost'
            size='sm'
            icon={<X />}
            ariaLabel='Close QR Code'
          />
        </div>

        {/* QR Code Content */}
        <div className='p-6'>
          <QRCodeHandler
            mode={mode}
            initialValue={value}
            readOnly={mode === 'generate'}
            onScan={onScan}
            onValidScan={mode === 'scan' ? onClose : undefined}
          />
        </div>
      </div>
    </div>
  )
}

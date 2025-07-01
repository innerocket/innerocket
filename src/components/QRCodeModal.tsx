import { X } from 'lucide-solid'
import { QRCodeHandler } from './QRCodeHandler'
import { IconButton } from './ui'
import { Show, type Component } from 'solid-js'

interface QRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  value?: string
  title?: string
  mode?: 'generate' | 'scan'
  onScan?: (data: string) => void
}

export const QRCodeModal: Component<QRCodeModalProps> = props => {
  return (
    <Show when={props.isOpen && (props.mode !== 'generate' || props.value)}>
      <div class='fixed inset-0 z-50 flex items-center justify-center bg-gray-900/75 p-4 backdrop-blur-sm'>
        <div class='relative w-full max-w-sm rounded-xl border-2 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'>
          {/* Header */}
          <div class='flex items-center justify-between rounded-t-xl border-b-2 border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800'>
            <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>
              {props.title || 'QR Code'}
            </h3>
            <IconButton
              onClick={props.onClose}
              variant='ghost'
              size='sm'
              icon={<X />}
              ariaLabel='Close QR Code'
            />
          </div>

          {/* QR Code Content */}
          <div class='p-6'>
            <QRCodeHandler
              mode={props.mode}
              initialValue={props.value}
              readOnly={props.mode === 'generate'}
              onScan={props.onScan}
              onValidScan={props.mode === 'scan' ? props.onClose : undefined}
            />
          </div>
        </div>
      </div>
    </Show>
  )
}

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
      <div class='fixed inset-0 bg-gray-900/75 backdrop-blur-sm flex justify-center items-center z-50 p-4'>
        <div class='relative bg-white rounded-xl border-2 border-gray-200 dark:bg-gray-800 dark:border-gray-700 max-w-sm w-full'>
          {/* Header */}
          <div class='p-6 bg-gray-50 border-b-2 border-gray-200 rounded-t-xl dark:bg-gray-800 dark:border-gray-700 flex justify-between items-center'>
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

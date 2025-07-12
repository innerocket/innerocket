import { Show, For } from 'solid-js'
import { HardDrive, Check, AlertTriangle } from 'lucide-solid'
import { FILE_SIZE_PRESETS, type FileSizePreset } from '../hooks/useFileTransfer'

interface FileSizeSettingsProps {
  maxFileSize: () => number
  formatFileSize: (bytes: number) => string
  onSetFromPreset: (preset: FileSizePreset) => void
  onSetCustomSize: (size: number) => void
}

export function FileSizeSettings(props: FileSizeSettingsProps) {
  const getCurrentPreset = (): FileSizePreset | 'custom' => {
    const currentSize = props.maxFileSize()
    for (const [preset, size] of Object.entries(FILE_SIZE_PRESETS)) {
      if (size === currentSize) {
        return preset as FileSizePreset
      }
    }
    return 'custom'
  }

  const isUnlimited = () => props.maxFileSize() === 0

  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <HardDrive class="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h4 class="text-lg font-medium text-gray-900 dark:text-white">
            File Size Limits
          </h4>
          <span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            {props.formatFileSize(props.maxFileSize())}
          </span>
        </div>
      </div>

      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p class="mb-2">
          <strong>Auto-accept behavior:</strong> When auto-accept is enabled, only files within
          the size limit will be automatically accepted.
        </p>
        <p>
          <strong>Security note:</strong> File size limits apply to both manual and automatic
          file acceptance.
        </p>
      </div>

      {/* Current status */}
      <Show when={isUnlimited()}>
        <div class="rounded-lg border border-orange-200 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20">
          <div class="flex items-center space-x-2">
            <AlertTriangle class="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h5 class="text-sm font-medium text-orange-800 dark:text-orange-300">
              No Size Limit
            </h5>
          </div>
          <p class="mt-2 text-sm text-orange-700 dark:text-orange-400">
            Files of any size will be accepted. Consider setting a limit for better performance
            and security.
          </p>
        </div>
      </Show>

      <Show when={!isUnlimited()}>
        <div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
          <div class="flex items-center space-x-2">
            <Check class="h-5 w-5 text-green-600 dark:text-green-400" />
            <h5 class="text-sm font-medium text-green-800 dark:text-green-300">
              Size Limit Active
            </h5>
          </div>
          <p class="mt-2 text-sm text-green-700 dark:text-green-400">
            Files larger than <strong>{props.formatFileSize(props.maxFileSize())}</strong> will
            require manual approval.
          </p>
        </div>
      </Show>

      {/* Preset options */}
      <div class="space-y-3">
        <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Size Presets
        </h5>
        
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <For each={Object.entries(FILE_SIZE_PRESETS)}>
            {([preset, size]) => {
              const isSelected = () => getCurrentPreset() === preset
              const presetKey = preset as FileSizePreset

              return (
                <button
                  onClick={() => props.onSetFromPreset(presetKey)}
                  class={`rounded-lg border-2 p-3 text-center transition-all duration-200 ${
                    isSelected()
                      ? 'border-blue-500 bg-blue-50 text-blue-800 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-700'
                  }`}
                >
                  <div class="flex items-center justify-center space-x-1">
                    {isSelected() && (
                      <Check class="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                    <span class="text-sm font-medium">{preset}</span>
                  </div>
                  <div class="mt-1 text-xs opacity-75">
                    {size === 0 ? 'No limit' : props.formatFileSize(size)}
                  </div>
                </button>
              )
            }}
          </For>
        </div>
      </div>

      {/* Custom size input */}
      <div class="space-y-3">
        <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300">
          Custom Size Limit
        </h5>
        
        <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
          <div class="space-y-3">
            <label for="custom-size" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Size in MB (0 for unlimited)
            </label>
            <div class="flex space-x-2">
              <input
                id="custom-size"
                type="number"
                min="0"
                step="1"
                placeholder="100"
                class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.currentTarget
                    const value = parseFloat(input.value)
                    if (!isNaN(value) && value >= 0) {
                      const sizeInBytes = value === 0 ? 0 : value * 1024 * 1024
                      props.onSetCustomSize(sizeInBytes)
                      input.value = ''
                    }
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement
                  if (input) {
                    const value = parseFloat(input.value)
                    if (!isNaN(value) && value >= 0) {
                      const sizeInBytes = value === 0 ? 0 : value * 1024 * 1024
                      props.onSetCustomSize(sizeInBytes)
                      input.value = ''
                    }
                  }
                }}
                class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-blue-500"
              >
                Set
              </button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Current limit: <strong>{props.formatFileSize(props.maxFileSize())}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Size comparison guide */}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/20">
        <h5 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          File Size Reference
        </h5>
        <div class="grid grid-cols-1 gap-2 text-xs text-gray-600 sm:grid-cols-2 dark:text-gray-400">
          <div class="space-y-1">
            <div><strong>10MB:</strong> High-quality photos, small videos</div>
            <div><strong>50MB:</strong> Short video clips, presentations</div>
            <div><strong>100MB:</strong> Medium videos, software packages</div>
          </div>
          <div class="space-y-1">
            <div><strong>500MB:</strong> Long videos, large datasets</div>
            <div><strong>1GB:</strong> HD movies, game files</div>
            <div><strong>5GB:</strong> Very large files, OS images</div>
          </div>
        </div>
      </div>
    </div>
  )
}
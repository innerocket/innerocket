import { Show } from 'solid-js'
import { Shield, Eye, EyeOff, AlertTriangle, Lock, Info } from 'lucide-solid'
import { Toggle } from './ui/Toggle'

interface PrivacySettingsProps {
  privacyMode: () => boolean
  onSetPrivacyMode: (enabled: boolean) => void
  connectionHistoryCount: () => number
}

export function PrivacySettings(props: PrivacySettingsProps) {
  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <Shield class="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h4 class="text-lg font-medium text-gray-900 dark:text-white">
            Privacy Settings
          </h4>
          <span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            {props.privacyMode() ? 'Private' : 'Normal'}
          </span>
        </div>
      </div>

      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p class="mb-2">
          <strong>Privacy mode:</strong> Control whether connection history and statistics are
          tracked and stored locally in your browser.
        </p>
        <p>
          <strong>Security note:</strong> Even in normal mode, all data stays on your device and
          is never sent to external servers.
        </p>
      </div>

      {/* Privacy Mode Toggle */}
      <div class="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <Toggle
          id="privacy-mode-toggle"
          checked={props.privacyMode()}
          onChange={props.onSetPrivacyMode}
          label="Enable privacy mode"
          description="Disable connection history tracking and clear existing data"
          variant="default"
          size="md"
        />

        <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          <p class="mb-2">
            <strong>Normal mode:</strong> Connection history, statistics, and transfer records
            are saved locally for your reference.
          </p>
          <p>
            <strong>Privacy mode:</strong> No connection history is tracked or saved. All
            existing history is immediately cleared.
          </p>
        </div>
      </div>

      {/* Privacy Mode Status */}
      <Show when={props.privacyMode()}>
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
          <div class="flex items-center space-x-2">
            <EyeOff class="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h5 class="text-sm font-medium text-blue-800 dark:text-blue-300">
              Privacy Mode Active
            </h5>
          </div>
          <p class="mt-2 text-sm text-blue-700 dark:text-blue-400">
            Connection history tracking is <strong>disabled</strong>. No connection data,
            statistics, or transfer records are being saved.
          </p>
          <div class="mt-3 rounded border border-blue-300 bg-blue-100 p-2 text-xs text-blue-800 dark:border-blue-600 dark:bg-blue-800/20 dark:text-blue-200">
            <div class="flex items-center space-x-1">
              <Lock class="h-3 w-3" />
              <span><strong>Enhanced Privacy:</strong> All existing history has been cleared</span>
            </div>
          </div>
        </div>
      </Show>

      <Show when={!props.privacyMode()}>
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
          <div class="flex items-center space-x-2">
            <Eye class="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h5 class="text-sm font-medium text-blue-800 dark:text-blue-300">
              Normal Mode Active
            </h5>
          </div>
          <p class="mt-2 text-sm text-blue-700 dark:text-blue-400">
            Connection history tracking is <strong>enabled</strong>. Connection statistics and
            transfer records are being saved locally.
          </p>
          <Show when={props.connectionHistoryCount() > 0}>
            <div class="mt-3 rounded border border-blue-300 bg-blue-100 p-2 text-xs text-blue-800 dark:border-blue-600 dark:bg-blue-800/20 dark:text-blue-200">
              <div class="flex items-center space-x-1">
                <Info class="h-3 w-3" />
                <span>
                  <strong>Current history:</strong> {props.connectionHistoryCount()} connection
                  {props.connectionHistoryCount() === 1 ? '' : 's'} recorded
                </span>
              </div>
            </div>
          </Show>
        </div>
      </Show>

      {/* Privacy Mode Warning */}
      <Show when={!props.privacyMode() && props.connectionHistoryCount() > 0}>
        <div class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-700 dark:bg-blue-900/20">
          <div class="flex items-start space-x-3">
            <AlertTriangle class="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h5 class="text-sm font-medium text-blue-800 dark:text-blue-300">
                Privacy Mode Warning
              </h5>
              <p class="mt-1 text-sm text-blue-700 dark:text-blue-400">
                Enabling privacy mode will <strong>permanently delete</strong> all existing
                connection history ({props.connectionHistoryCount()} connections). This action
                cannot be undone.
              </p>
            </div>
          </div>
        </div>
      </Show>

      {/* Privacy Information */}
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/20">
        <h5 class="mb-3 flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <Info class="h-4 w-4" />
          <span>Privacy Information</span>
        </h5>
        <div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
          <p>
            <strong>Local storage only:</strong> All data is stored locally in your browser and
            never transmitted to external servers.
          </p>
          <p>
            <strong>No tracking:</strong> We do not collect, store, or share any personal
            information or usage data.
          </p>
          <p>
            <strong>Your control:</strong> You can enable/disable history tracking or clear all
            data at any time.
          </p>
          <p>
            <strong>Secure transfers:</strong> File transfers remain end-to-end encrypted
            regardless of privacy mode settings.
          </p>
        </div>
      </div>
    </div>
  )
}
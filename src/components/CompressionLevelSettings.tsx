import { Show, For } from 'solid-js'
import { Zap, TrendingUp, Trophy, Check, Settings } from 'lucide-solid'
import { COMPRESSION_LEVELS, type CompressionLevelPreset } from '../hooks/useFileTransfer'

interface CompressionLevelSettingsProps {
  compressionEnabled: () => boolean
  compressionLevel: () => CompressionLevelPreset
  onSetCompressionLevel: (level: CompressionLevelPreset) => void
}

const LEVEL_ICONS = {
  fast: Zap,
  balanced: TrendingUp,
  best: Trophy,
} as const

export function CompressionLevelSettings(props: CompressionLevelSettingsProps) {
  return (
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <Settings class="h-5 w-5 text-purple-600 dark:text-purple-400" />
          <h4 class="text-lg font-medium text-gray-900 dark:text-white">
            Compression Level
          </h4>
          <span class="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
            {COMPRESSION_LEVELS[props.compressionLevel()].label}
          </span>
        </div>
      </div>

      <div class="text-sm text-gray-600 dark:text-gray-400">
        <p class="mb-2">
          <strong>Compression quality:</strong> Higher levels provide better compression but take
          more processing time and CPU resources.
        </p>
        <p>
          <strong>Performance note:</strong> Fast compression is recommended for real-time transfers
          and slower devices.
        </p>
      </div>

      {/* Disabled state */}
      <Show when={!props.compressionEnabled()}>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800">
          <div class="flex items-center space-x-2">
            <Settings class="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300">
              Compression Disabled
            </h5>
          </div>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            File compression is currently disabled. Enable compression in the settings above to
            configure compression levels.
          </p>
        </div>
      </Show>

      {/* Compression level options */}
      <Show when={props.compressionEnabled()}>
        <div class="space-y-3">
          <h5 class="text-sm font-medium text-gray-700 dark:text-gray-300">
            Choose Compression Level
          </h5>
          
          <div class="space-y-3">
            <For each={Object.entries(COMPRESSION_LEVELS)}>
              {([levelKey, levelData]) => {
                const level = levelKey as CompressionLevelPreset
                const Icon = LEVEL_ICONS[level]
                const isSelected = () => props.compressionLevel() === level

                return (
                  <div
                    onClick={() => props.onSetCompressionLevel(level)}
                    class={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                      isSelected()
                        ? 'border-purple-500 bg-purple-50 dark:border-purple-400 dark:bg-purple-900/20'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-3">
                        <div
                          class={`rounded-lg p-2 ${
                            isSelected()
                              ? 'bg-purple-100 dark:bg-purple-800/20'
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}
                        >
                          <Icon
                            class={`h-5 w-5 ${
                              isSelected()
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}
                          />
                        </div>
                        <div>
                          <h6
                            class={`text-sm font-medium ${
                              isSelected()
                                ? 'text-purple-800 dark:text-purple-300'
                                : 'text-gray-900 dark:text-white'
                            }`}
                          >
                            {levelData.label} (Level {levelData.level})
                          </h6>
                          <p
                            class={`text-xs ${
                              isSelected()
                                ? 'text-purple-600 dark:text-purple-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {levelData.description}
                          </p>
                        </div>
                      </div>
                      <div
                        class={`rounded-full p-1 ${
                          isSelected()
                            ? 'bg-purple-200 dark:bg-purple-700/30'
                            : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        {isSelected() ? (
                          <Check class="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <div class="h-4 w-4"></div>
                        )}
                      </div>
                    </div>

                    {/* Performance indicators */}
                    <div class="mt-3 border-t border-gray-200 pt-3 dark:border-gray-600">
                      <div class="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span class="font-medium text-gray-700 dark:text-gray-300">Speed:</span>
                          <div class="mt-1 flex space-x-1">
                            <For each={Array(3).fill(0)}>
                              {(_, index) => (
                                <div
                                  class={`h-1 w-3 rounded ${
                                    (level === 'fast' && index() < 3) ||
                                    (level === 'balanced' && index() < 2) ||
                                    (level === 'best' && index() < 1)
                                      ? isSelected()
                                        ? 'bg-purple-500'
                                        : 'bg-gray-400'
                                      : 'bg-gray-200 dark:bg-gray-600'
                                  }`}
                                ></div>
                              )}
                            </For>
                          </div>
                        </div>
                        <div>
                          <span class="font-medium text-gray-700 dark:text-gray-300">
                            Compression:
                          </span>
                          <div class="mt-1 flex space-x-1">
                            <For each={Array(3).fill(0)}>
                              {(_, index) => (
                                <div
                                  class={`h-1 w-3 rounded ${
                                    (level === 'best' && index() < 3) ||
                                    (level === 'balanced' && index() < 2) ||
                                    (level === 'fast' && index() < 1)
                                      ? isSelected()
                                        ? 'bg-purple-500'
                                        : 'bg-gray-400'
                                      : 'bg-gray-200 dark:bg-gray-600'
                                  }`}
                                ></div>
                              )}
                            </For>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

        {/* Current setting summary */}
        <div class="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-700 dark:bg-purple-900/20">
          <h5 class="text-sm font-medium text-purple-800 dark:text-purple-300">
            Current Setting: {COMPRESSION_LEVELS[props.compressionLevel()].label}
          </h5>
          <p class="mt-2 text-sm text-purple-700 dark:text-purple-400">
            {COMPRESSION_LEVELS[props.compressionLevel()].description}
          </p>
          <div class="mt-3 text-xs text-purple-600 dark:text-purple-300">
            <strong>Technical level:</strong> {COMPRESSION_LEVELS[props.compressionLevel()].level}/9
          </div>
        </div>

        {/* Usage recommendations */}
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700/20">
          <h5 class="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Usage Recommendations
          </h5>
          <div class="space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div class="flex items-start space-x-2">
              <Zap class="mt-0.5 h-3 w-3 text-green-500" />
              <div>
                <strong>Fast:</strong> Best for real-time sharing, mobile devices, or when speed is
                more important than file size
              </div>
            </div>
            <div class="flex items-start space-x-2">
              <TrendingUp class="mt-0.5 h-3 w-3 text-blue-500" />
              <div>
                <strong>Balanced:</strong> Good all-around choice for most file transfers with
                reasonable speed and compression
              </div>
            </div>
            <div class="flex items-start space-x-2">
              <Trophy class="mt-0.5 h-3 w-3 text-orange-500" />
              <div>
                <strong>Best:</strong> Maximum compression for large files when bandwidth is limited
                and you don't mind slower processing
              </div>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
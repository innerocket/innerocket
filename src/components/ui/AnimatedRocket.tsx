import { type Component, createSignal, onMount, onCleanup } from 'solid-js'
import { tv, type VariantProps } from 'tailwind-variants'

const rocket = tv({
  base: 'inline-block transition-all duration-1000 ease-in-out transform-gpu',
  variants: {
    size: {
      sm: 'h-4 w-4',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-12 w-12',
    },
    animation: {
      bounce: 'animate-bounce',
      pulse: 'animate-pulse',
      spin: 'animate-spin',
      ping: 'animate-ping',
      none: '',
    },
  },
  defaultVariants: {
    size: 'md',
    animation: 'none',
  },
})

export type AnimatedRocketProps = VariantProps<typeof rocket> & {
  class?: string
  autoLaunch?: boolean
  launchDuration?: number
  trajectory?: 'straight' | 'arc' | 'spiral'
  color?: string
  loop?: boolean
  loopDelay?: number
}

export const AnimatedRocket: Component<AnimatedRocketProps> = props => {
  const [isLaunching, setIsLaunching] = createSignal(false)
  const [position, setPosition] = createSignal({ x: 0, y: 0, rotate: 0 })
  let animationFrame: number | undefined
  let timeoutId: number | undefined
  let loopTimeoutId: number | undefined

  const launch = () => {
    if (isLaunching()) return

    setIsLaunching(true)
    const duration = props.launchDuration || 3000
    const returnDuration = duration * 0.8
    const totalDuration = duration + returnDuration + 1000
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const totalProgress = Math.min(elapsed / totalDuration, 1)

      let x = 0,
        y = 0,
        rotate = 0

      if (elapsed < duration) {
        // Launch phase - go to top right
        const progress = elapsed / duration
        switch (props.trajectory) {
          case 'arc':
            x = progress * 300 + Math.sin(progress * Math.PI * 0.5) * 50
            y = -progress * 250 - Math.sin(progress * Math.PI) * 100
            // Calculate angle based on movement direction
            const prevX = (progress - 0.01) * 300 + Math.sin((progress - 0.01) * Math.PI * 0.5) * 50
            const prevY = -(progress - 0.01) * 250 - Math.sin((progress - 0.01) * Math.PI) * 100
            rotate = Math.atan2(y - prevY, x - prevX) * (180 / Math.PI) + 90
            break
          case 'spiral':
            x = Math.cos(progress * Math.PI * 4) * (150 - progress * 100) + progress * 250
            y = -progress * 300 + Math.sin(progress * Math.PI * 4) * 30
            // Calculate angle based on movement direction
            const prevSpiralX = Math.cos((progress - 0.01) * Math.PI * 4) * (150 - (progress - 0.01) * 100) + (progress - 0.01) * 250
            const prevSpiralY = -(progress - 0.01) * 300 + Math.sin((progress - 0.01) * Math.PI * 4) * 30
            rotate = Math.atan2(y - prevSpiralY, x - prevSpiralX) * (180 / Math.PI) + 90
            break
          case 'straight':
          default:
            x = progress * 300
            y = -progress * 300
            rotate = -45 + 90 // Adjust for SVG orientation - rocket points right-up
            break
        }
      } else if (elapsed < duration + 1000) {
        // Pause phase at top right - maintain last direction
        switch (props.trajectory) {
          case 'arc':
            x = 300
            y = -350
            rotate = -45 + 90 // pointing towards return direction
            break
          case 'spiral':
            x = 250
            y = -300
            rotate = -45 + 90
            break
          case 'straight':
          default:
            x = 300
            y = -300
            rotate = -45 + 90
            break
        }
      } else {
        // Return phase - come back from bottom left
        const returnProgress = (elapsed - duration - 1000) / returnDuration
        const easeProgress = 1 - Math.pow(1 - returnProgress, 3)

        switch (props.trajectory) {
          case 'arc':
            x = 300 - easeProgress * 600 + Math.sin(easeProgress * Math.PI) * 50
            y = -350 + easeProgress * 250 + Math.sin(easeProgress * Math.PI * 0.5) * 100
            // Calculate return direction
            const returnPrevX = 300 - (easeProgress - 0.01) * 600 + Math.sin((easeProgress - 0.01) * Math.PI) * 50
            const returnPrevY = -350 + (easeProgress - 0.01) * 250 + Math.sin((easeProgress - 0.01) * Math.PI * 0.5) * 100
            rotate = Math.atan2(y - returnPrevY, x - returnPrevX) * (180 / Math.PI) + 90
            break
          case 'spiral':
            x = 250 - easeProgress * 550 + Math.cos(easeProgress * Math.PI * 3) * 50
            y = -300 + easeProgress * 200 + Math.sin(easeProgress * Math.PI * 3) * 30
            // Calculate return direction
            const returnSpiralPrevX = 250 - (easeProgress - 0.01) * 550 + Math.cos((easeProgress - 0.01) * Math.PI * 3) * 50
            const returnSpiralPrevY = -300 + (easeProgress - 0.01) * 200 + Math.sin((easeProgress - 0.01) * Math.PI * 3) * 30
            rotate = Math.atan2(y - returnSpiralPrevY, x - returnSpiralPrevX) * (180 / Math.PI) + 90
            break
          case 'straight':
          default:
            x = 300 - easeProgress * 600
            y = -300 + easeProgress * 200
            rotate = 135 + 90 // pointing towards origin from bottom left
            break
        }
      }

      setPosition({ x, y, rotate })

      if (totalProgress < 1) {
        animationFrame = requestAnimationFrame(animate)
      } else {
        timeoutId = window.setTimeout(() => {
          setIsLaunching(false)
          setPosition({ x: 0, y: 0, rotate: 0 })
          
          // Start next loop if loop is enabled
          if (props.loop) {
            const delay = props.loopDelay || 2000
            loopTimeoutId = window.setTimeout(() => {
              launch()
            }, delay)
          }
        }, 500)
      }
    }

    animationFrame = requestAnimationFrame(animate)
  }

  onMount(() => {
    if (props.autoLaunch) {
      const delay = setTimeout(launch, 1000)
      onCleanup(() => clearTimeout(delay))
    }
  })

  onCleanup(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    if (loopTimeoutId) {
      clearTimeout(loopTimeoutId)
    }
  })

  const rocketStyle = () => ({
    transform: `translate(${position().x}px, ${position().y}px) rotate(${position().rotate}deg)`,
    transition: isLaunching() ? 'none' : 'transform 0.5s ease-out',
  })

  return (
    <div class='relative inline-block'>
      <button
        onClick={launch}
        disabled={isLaunching()}
        class='group relative rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
        aria-label='Launch rocket'
      >
        <div
          class={rocket({
            size: props.size,
            animation: isLaunching() ? 'none' : props.animation,
            class: props.class,
          })}
          style={rocketStyle()}
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 16 16'
            width='16'
            height='16'
            class='h-full w-full transition-transform duration-200 group-hover:scale-110'
          >
            <path
              d='M14.064 0h.186C15.216 0 16 .784 16 1.75v.186a8.752 8.752 0 0 1-2.564 6.186l-.458.459c-.314.314-.641.616-.979.904v3.207c0 .608-.315 1.172-.833 1.49l-2.774 1.707a.749.749 0 0 1-1.11-.418l-.954-3.102a1.214 1.214 0 0 1-.145-.125L3.754 9.816a1.218 1.218 0 0 1-.124-.145L.528 8.717a.749.749 0 0 1-.418-1.11l1.71-2.774A1.748 1.748 0 0 1 3.31 4h3.204c.288-.338.59-.665.904-.979l.459-.458A8.749 8.749 0 0 1 14.064 0ZM8.938 3.623h-.002l-.458.458c-.76.76-1.437 1.598-2.02 2.5l-1.5 2.317 2.143 2.143 2.317-1.5c.902-.583 1.74-1.26 2.499-2.02l.459-.458a7.25 7.25 0 0 0 2.123-5.127V1.75a.25.25 0 0 0-.25-.25h-.186a7.249 7.249 0 0 0-5.125 2.123ZM3.56 14.56c-.732.732-2.334 1.045-3.005 1.148a.234.234 0 0 1-.201-.064.234.234 0 0 1-.064-.201c.103-.671.416-2.273 1.15-3.003a1.502 1.502 0 1 1 2.12 2.12Zm6.94-3.935c-.088.06-.177.118-.266.175l-2.35 1.521.548 1.783 1.949-1.2a.25.25 0 0 0 .119-.213ZM3.678 8.116 5.2 5.766c.058-.09.117-.178.176-.266H3.309a.25.25 0 0 0-.213.119l-1.2 1.95ZM12 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z'
              fill={props.color || 'currentColor'}
            />
          </svg>
        </div>

      </button>

      {/* Launch status indicator */}
      {isLaunching() && (
        <div class='absolute -bottom-8 left-1/2 -translate-x-1/2 transform animate-pulse text-xs text-gray-500 dark:text-gray-400'>
          Launching...
        </div>
      )}
    </div>
  )
}

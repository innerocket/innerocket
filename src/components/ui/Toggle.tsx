import { type JSX, createSignal, createEffect } from 'solid-js'
import { tv, type VariantProps } from 'tailwind-variants'

const toggleVariants = tv({
  slots: {
    base: 'relative inline-flex items-center cursor-pointer',
    switch:
      'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2',
    thumb: 'inline-block h-3 w-3 transform rounded-full bg-white transition-transform',
  },
  variants: {
    variant: {
      default: {
        switch: 'bg-slate-300 data-[checked]:bg-blue-600',
        thumb: 'translate-x-1 data-[checked]:translate-x-5',
      },
      success: {
        switch: 'bg-slate-300 data-[checked]:bg-green-600',
        thumb: 'translate-x-1 data-[checked]:translate-x-5',
      },
    },
    size: {
      sm: {
        switch: 'h-4 w-7',
        thumb: 'h-2.5 w-2.5 translate-x-0.5 data-[checked]:translate-x-3.5',
      },
      md: {
        switch: 'h-5 w-9',
        thumb: 'h-3 w-3 translate-x-1 data-[checked]:translate-x-5',
      },
      lg: {
        switch: 'h-6 w-11',
        thumb: 'h-4 w-4 translate-x-1 data-[checked]:translate-x-6',
      },
    },
    disabled: {
      true: {
        switch: 'opacity-50 cursor-not-allowed',
        thumb: 'opacity-50',
      },
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'md',
  },
})

type ToggleVariants = VariantProps<typeof toggleVariants>

export interface ToggleProps extends ToggleVariants {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  disabled?: boolean
  label?: string
  description?: string
  id?: string
  class?: string
  children?: JSX.Element
}

export function Toggle(props: ToggleProps) {
  const [checked, setChecked] = createSignal(props.defaultChecked ?? props.checked ?? false)

  createEffect(() => {
    if (props.checked !== undefined) {
      setChecked(props.checked)
    }
  })

  const handleToggle = () => {
    if (props.disabled) return

    const newChecked = !checked()
    setChecked(newChecked)
    props.onChange?.(newChecked)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      handleToggle()
    }
  }

  const {
    base,
    switch: switchClass,
    thumb,
  } = toggleVariants({
    variant: props.variant,
    size: props.size,
    disabled: props.disabled,
  })

  return (
    <div class={base({ class: props.class })}>
      <div class='flex items-center space-x-3 sm:items-center'>
        <button
          type='button'
          role='switch'
          aria-checked={checked()}
          aria-labelledby={props.id ? `${props.id}-label` : undefined}
          aria-describedby={props.id ? `${props.id}-description` : undefined}
          disabled={props.disabled}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          class={`${switchClass()} flex-shrink-0`}
          data-checked={checked() || undefined}
        >
          <span class={thumb()} data-checked={checked() || undefined} />
        </button>

        {(props.label || props.description || props.children) && (
          <div class='flex min-w-0 flex-1 flex-col'>
            {props.label && (
              <label
                id={props.id ? `${props.id}-label` : undefined}
                class='cursor-pointer text-sm font-medium text-slate-900 dark:text-white'
                onClick={handleToggle}
              >
                {props.label}
              </label>
            )}
            {props.description && (
              <p
                id={props.id ? `${props.id}-description` : undefined}
                class='mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400'
              >
                {props.description}
              </p>
            )}
            {props.children}
          </div>
        )}
      </div>
    </div>
  )
}

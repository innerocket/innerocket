import {
  type JSX,
  Show,
  splitProps,
  type Component,
  type ParentProps,
  createSignal,
  For,
} from 'solid-js'
import { ChevronDown } from 'lucide-solid'
import { tv } from 'tailwind-variants'

const accordion = tv({
  base: 'w-full space-y-2',
})

const accordionItem = tv({
  base: 'rounded-lg border border-gray-200 bg-white transition-all duration-200 dark:border-gray-700 dark:bg-gray-800',
})

const accordionHeader = tv({
  base: 'flex w-full items-center justify-between rounded-lg p-4 text-left font-medium text-gray-900 transition-all duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-400',
  variants: {
    isOpen: {
      true: 'rounded-b-none border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700',
      false: '',
    },
  },
})

const accordionContent = tv({
  base: 'overflow-hidden transition-all duration-300 ease-in-out',
  variants: {
    isOpen: {
      true: 'opacity-100',
      false: 'max-h-0 opacity-0',
    },
  },
})

const accordionIcon = tv({
  base: 'h-5 w-5 text-gray-500 transition-transform duration-200 dark:text-gray-400',
  variants: {
    isOpen: {
      true: 'rotate-180',
      false: 'rotate-0',
    },
  },
})

export type AccordionItemProps = ParentProps<{
  title: string | JSX.Element
  subtitle?: string | JSX.Element
  defaultOpen?: boolean
  disabled?: boolean
  class?: string
}>

export type AccordionProps = ParentProps<{
  multiple?: boolean
  class?: string
  items?: AccordionItemProps[]
}>

export const AccordionItem: Component<AccordionItemProps> = props => {
  const [local, rest] = splitProps(props, [
    'title',
    'subtitle',
    'children',
    'defaultOpen',
    'disabled',
    'class',
  ])

  const [isOpen, setIsOpen] = createSignal(local.defaultOpen || false)

  const toggleOpen = () => {
    if (!local.disabled) {
      setIsOpen(!isOpen())
    }
  }

  return (
    <div class={accordionItem({ class: local.class })} {...rest}>
      <button
        type='button'
        class={accordionHeader({ isOpen: isOpen() })}
        onClick={toggleOpen}
        disabled={local.disabled}
      >
        <div class='flex-1 text-left'>
          <Show when={typeof local.title === 'string'} fallback={local.title}>
            <div class='text-lg font-medium'>{local.title}</div>
          </Show>
          <Show when={local.subtitle}>
            <Show when={typeof local.subtitle === 'string'} fallback={local.subtitle}>
              <div class='mt-1 text-sm text-gray-600 dark:text-gray-400'>{local.subtitle}</div>
            </Show>
          </Show>
        </div>
        <ChevronDown class={accordionIcon({ isOpen: isOpen() })} />
      </button>
      <div class={accordionContent({ isOpen: isOpen() })}>
        <Show when={isOpen()}>
          <div class='p-4'>{local.children}</div>
        </Show>
      </div>
    </div>
  )
}

export const Accordion: Component<AccordionProps> = props => {
  const [local, rest] = splitProps(props, ['children', 'multiple', 'class', 'items'])

  return (
    <div class={accordion({ class: local.class })} {...rest}>
      <Show when={local.items} fallback={local.children}>
        <For each={local.items}>
          {item => <AccordionItem {...item}>{item.children}</AccordionItem>}
        </For>
      </Show>
    </div>
  )
}

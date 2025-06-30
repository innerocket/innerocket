import { type JSX, Show, splitProps, type Component, type ParentProps } from 'solid-js'

export type CardProps = ParentProps<{
  title?: string | JSX.Element
  subtitle?: string | JSX.Element
  footer?: JSX.Element
  class?: string
  headerClass?: string
  bodyClass?: string
  footerClass?: string
}>

export const Card: Component<CardProps> = props => {
  const [local, rest] = splitProps(props, [
    'title',
    'subtitle',
    'children',
    'footer',
    'class',
    'headerClass',
    'bodyClass',
    'footerClass',
  ])

  const hasHeader = () => local.title || local.subtitle

  return (
    <div
      class={`w-full bg-white border border-gray-200 rounded-lg transition-all duration-200 dark:bg-gray-800 dark:border-gray-700 ${
        local.class || ''
      }`}
      {...rest}
    >
      <Show when={hasHeader()}>
        <div
          class={`p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 rounded-t-lg dark:from-gray-800 dark:to-gray-700 dark:border-gray-700 ${
            local.headerClass || ''
          }`}
        >
          <Show when={typeof local.title === 'string'} fallback={local.title}>
            <h5 class='text-xl font-semibold text-gray-900 dark:text-white'>{local.title}</h5>
          </Show>
          <Show when={typeof local.subtitle === 'string'} fallback={local.subtitle}>
            <p class='text-sm text-gray-600 dark:text-gray-300 mt-1'>{local.subtitle}</p>
          </Show>
        </div>
      </Show>
      <div class={`p-4 sm:p-6 ${!hasHeader() ? 'rounded-t-lg' : ''} ${local.bodyClass || ''}`}>
        {local.children}
      </div>
      <Show when={local.footer}>
        <div
          class={`p-4 sm:p-6 bg-gray-50 border-t border-gray-200 rounded-b-lg dark:bg-gray-700 dark:border-gray-600 ${
            local.footerClass || ''
          }`}
        >
          {local.footer}
        </div>
      </Show>
    </div>
  )
}

export type CardSectionProps = ParentProps<{
  title?: string | JSX.Element
  class?: string
}>

export const CardSection: Component<CardSectionProps> = props => {
  const [local, rest] = splitProps(props, ['title', 'children', 'class'])

  return (
    <div class={`mb-4 ${local.class || ''}`} {...rest}>
      <Show when={local.title}>
        <Show
          when={typeof local.title === 'string'}
          fallback={<div class='mb-2'>{local.title}</div>}
        >
          <h3 class='mb-2 text-lg font-medium text-gray-900 dark:text-white'>{local.title}</h3>
        </Show>
      </Show>
      <div>{local.children}</div>
    </div>
  )
}

import {
  createContext,
  useContext,
  type Component,
  type ParentProps,
  Show,
  type JSX,
} from 'solid-js'
import { tv } from 'tailwind-variants'
interface TabsContextType {
  activeTab: () => string
  onTabChange: (tab: string) => void
}

const TabsContext = createContext<TabsContextType>()

const useTabs = () => {
  const context = useContext(TabsContext)
  if (!context) throw new Error('useTabs must be used within a TabsProvider')
  return context
}

const tabsContainer = tv({
  base: 'w-full',
})

const tabsList = tv({
  base: 'flex flex-nowrap overflow-x-auto border-b border-gray-200 dark:border-gray-700 scrollbar-hide',
})

const tabButton = tv({
  base: 'px-3 py-2 sm:px-6 sm:py-3 text-sm font-medium transition-colors duration-200 border-b-2 whitespace-nowrap flex-shrink-0',
  variants: {
    active: {
      true: 'text-blue-600 border-blue-600 dark:text-blue-500 dark:border-blue-500',
      false:
        'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
    },
  },
})

const tabContent = tv({
  base: 'mt-6',
})

export type TabsProviderProps = ParentProps<{
  activeTab: string
  onTabChange: (tab: string) => void
  class?: string
}>

export const TabsProvider: Component<TabsProviderProps> = props => {
  const value = {
    activeTab: () => props.activeTab,
    onTabChange: props.onTabChange,
  }

  return (
    <TabsContext.Provider value={value}>
      <div class={tabsContainer({ class: props.class })}>{props.children}</div>
    </TabsContext.Provider>
  )
}

export type TabListProps = ParentProps<{
  class?: string
}>

export const TabList: Component<TabListProps> = props => {
  return (
    <div
      class={tabsList({ class: props.class })}
      style={{ 'scrollbar-width': 'none', '-ms-overflow-style': 'none' } as JSX.CSSProperties}
    >
      {props.children}
    </div>
  )
}

export type TabButtonProps = ParentProps<{
  value: string
  class?: string
}>

export const TabButton: Component<TabButtonProps> = props => {
  const { activeTab, onTabChange } = useTabs()
  const isActive = () => activeTab() === props.value

  return (
    <button
      type='button'
      class={tabButton({ active: isActive(), class: props.class })}
      onClick={() => onTabChange(props.value)}
    >
      {props.children}
    </button>
  )
}

export type TabContentProps = ParentProps<{
  value: string
  class?: string
}>

export const TabContent: Component<TabContentProps> = props => {
  const { activeTab } = useTabs()
  return (
    <Show when={activeTab() === props.value}>
      <div class={tabContent({ class: props.class })}>{props.children}</div>
    </Show>
  )
}

import type { ReactNode } from 'preact/compat'
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import { tv } from 'tailwind-variants'

interface TabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  children: ReactNode
  className?: string
}

interface TabListProps {
  children: ReactNode
  className?: string
}

interface TabProps {
  value: string
  children: ReactNode
  className?: string
}

interface TabPanelProps {
  value: string
  activeTab: string
  children: ReactNode
  className?: string
}

interface TabsContextType {
  activeTab: string
  onTabChange: (tab: string) => void
}

const TabsContext = createContext<TabsContextType | null>(null)

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
      true: 'text-blue-500 border-blue-500 dark:text-blue-600 dark:border-blue-600',
      false:
        'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200',
    },
  },
})

const tabContent = tv({
  base: 'mt-6',
})

export function TabsProvider({ activeTab, onTabChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ activeTab, onTabChange }}>
      <div className={tabsContainer({ className })}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabList({ children, className = '' }: TabListProps) {
  return (
    <div
      className={tabsList({ className })}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {children}
    </div>
  )
}

export function TabButton({ value, children, className = '' }: TabProps) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabButton must be used within TabsProvider')

  const { activeTab, onTabChange } = context
  const isActive = activeTab === value

  return (
    <button
      type='button'
      className={tabButton({ active: isActive, className })}
      onClick={() => onTabChange(value)}
    >
      {children}
    </button>
  )
}

export function TabContent({ value, children, className = '' }: Omit<TabPanelProps, 'activeTab'>) {
  const context = useContext(TabsContext)
  if (!context) throw new Error('TabContent must be used within TabsProvider')

  const { activeTab } = context
  if (value !== activeTab) return null

  return <div className={tabContent({ className })}>{children}</div>
}

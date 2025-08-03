import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Toggle } from './Toggle'
import { createSignal } from 'solid-js'

const meta = {
  title: 'UI/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'success'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    checked: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    label: {
      control: { type: 'text' },
    },
    description: {
      control: { type: 'text' },
    },
  },
} satisfies Meta<typeof Toggle>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    label: 'Enable notifications',
  },
}

export const WithDescription: Story = {
  args: {
    label: 'Enable notifications',
    description: 'Get notified when something happens',
  },
}

export const Checked: Story = {
  args: {
    label: 'Enable notifications',
    checked: true,
  },
}

export const Disabled: Story = {
  args: {
    label: 'Enable notifications',
    disabled: true,
  },
}

export const DisabledChecked: Story = {
  args: {
    label: 'Enable notifications',
    checked: true,
    disabled: true,
  },
}

export const Variants: Story = {
  render: () => (
    <div class='space-y-4'>
      <Toggle label='Default variant' variant='default' />
      <Toggle label='Success variant' variant='success' />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div class='space-y-4'>
      <Toggle label='Small toggle' size='sm' />
      <Toggle label='Medium toggle' size='md' />
      <Toggle label='Large toggle' size='lg' />
    </div>
  ),
}

export const Controlled: Story = {
  render: () => {
    const [isEnabled, setIsEnabled] = createSignal(false)

    return (
      <div class='space-y-4'>
        <Toggle
          label='Controlled toggle'
          description={`Toggle is currently ${isEnabled() ? 'enabled' : 'disabled'}`}
          checked={isEnabled()}
          onChange={setIsEnabled}
        />
        <p class='text-sm text-gray-600 dark:text-gray-400'>
          Current state: {isEnabled() ? 'On' : 'Off'}
        </p>
      </div>
    )
  },
}

export const SettingsPanel: Story = {
  render: () => {
    type SettingsType = {
      notifications: boolean
      darkMode: boolean
      autoSave: boolean
      analytics: boolean
    }

    const [settings, setSettings] = createSignal<SettingsType>({
      notifications: true,
      darkMode: false,
      autoSave: true,
      analytics: false,
    })

    const updateSetting = (key: keyof SettingsType, value: boolean) => {
      setSettings(prev => ({ ...prev, [key]: value }))
    }

    return (
      <div class='w-80 space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800'>
        <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>Settings</h3>

        <div class='space-y-4'>
          <Toggle
            label='Push Notifications'
            description='Receive notifications on your device'
            checked={settings().notifications}
            onChange={value => updateSetting('notifications', value)}
          />

          <Toggle
            label='Dark Mode'
            description='Use dark theme throughout the app'
            variant='success'
            checked={settings().darkMode}
            onChange={value => updateSetting('darkMode', value)}
          />

          <Toggle
            label='Auto Save'
            description='Automatically save your work'
            checked={settings().autoSave}
            onChange={value => updateSetting('autoSave', value)}
          />

          <Toggle
            label='Analytics'
            description='Help improve the app by sharing usage data'
            checked={settings().analytics}
            onChange={value => updateSetting('analytics', value)}
          />
        </div>

        <div class='border-t border-gray-200 pt-4 dark:border-gray-700'>
          <p class='text-xs text-gray-500 dark:text-gray-400'>
            Current settings: {JSON.stringify(settings(), null, 2)}
          </p>
        </div>
      </div>
    )
  },
}

export const PermissionsPanel: Story = {
  render: () => (
    <div class='w-80 space-y-4 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800'>
      <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>Privacy & Permissions</h3>

      <Toggle label='Camera Access' description='Allow the app to access your camera' size='sm' />

      <Toggle
        label='Microphone Access'
        description='Allow the app to access your microphone'
        size='sm'
      />

      <Toggle
        label='Location Services'
        description='Share your location for better experience'
        size='sm'
        variant='success'
      />

      <Toggle
        label='File System Access'
        description='Allow reading and writing files'
        size='sm'
        checked={true}
        disabled={true}
      />
    </div>
  ),
}

export const WithCustomContent: Story = {
  render: () => (
    <div class='space-y-4'>
      <Toggle label='Custom Content Example'>
        <div class='mt-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
          <p class='text-sm text-blue-700 dark:text-blue-300'>
            This is custom content that appears when you use the children prop.
          </p>
        </div>
      </Toggle>
    </div>
  ),
}

export const Interactive: Story = {
  render: () => {
    type FeaturesType = {
      feature1: boolean
      feature2: boolean
      feature3: boolean
    }

    const [features, setFeatures] = createSignal<FeaturesType>({
      feature1: false,
      feature2: true,
      feature3: false,
    })

    const toggleFeature = (feature: keyof FeaturesType) => {
      setFeatures(prev => ({
        ...prev,
        [feature]: !prev[feature],
      }))
    }

    return (
      <div class='w-96 space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800'>
        <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>Feature Toggles</h3>

        <div class='space-y-4'>
          <Toggle
            label='Beta Features'
            description='Enable experimental features (may be unstable)'
            checked={features().feature1}
            onChange={() => toggleFeature('feature1')}
            variant='default'
          />

          <Toggle
            label='Advanced Analytics'
            description='Detailed usage statistics and insights'
            checked={features().feature2}
            onChange={() => toggleFeature('feature2')}
            variant='success'
            size='lg'
          />

          <Toggle
            label='Developer Mode'
            description='Show debug information and developer tools'
            checked={features().feature3}
            onChange={() => toggleFeature('feature3')}
            size='sm'
          />
        </div>

        <div class='mt-6 rounded-md bg-gray-50 p-4 dark:bg-gray-700'>
          <h4 class='mb-2 text-sm font-medium text-gray-900 dark:text-white'>Active Features:</h4>
          <ul class='space-y-1 text-sm text-gray-600 dark:text-gray-300'>
            {features().feature1 && <li>• Beta Features</li>}
            {features().feature2 && <li>• Advanced Analytics</li>}
            {features().feature3 && <li>• Developer Mode</li>}
            {!features().feature1 && !features().feature2 && !features().feature3 && (
              <li class='text-gray-400'>No features enabled</li>
            )}
          </ul>
        </div>
      </div>
    )
  },
}

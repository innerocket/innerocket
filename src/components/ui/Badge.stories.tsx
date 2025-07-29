import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Badge } from './Badge'
import { Check, X, AlertTriangle, Info, Star, Users, Clock, Shield } from 'lucide-solid'

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark'],
    },
    rounded: {
      control: { type: 'boolean' },
    },
    label: {
      control: { type: 'text' },
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    label: 'Primary',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    label: 'Secondary',
    variant: 'secondary',
  },
}

export const Success: Story = {
  args: {
    label: 'Success',
    variant: 'success',
  },
}

export const Danger: Story = {
  args: {
    label: 'Danger',
    variant: 'danger',
  },
}

export const Warning: Story = {
  args: {
    label: 'Warning',
    variant: 'warning',
  },
}

export const WithIcon: Story = {
  args: {
    label: 'Verified',
    variant: 'success',
    icon: <Check class='h-3 w-3' />,
  },
}

export const WithIcons: Story = {
  render: () => (
    <div class='flex flex-wrap gap-2'>
      <Badge label='Completed' variant='success' icon={<Check class='h-3 w-3' />} />
      <Badge label='Failed' variant='danger' icon={<X class='h-3 w-3' />} />
      <Badge label='Warning' variant='warning' icon={<AlertTriangle class='h-3 w-3' />} />
      <Badge label='Info' variant='info' icon={<Info class='h-3 w-3' />} />
      <Badge label='Premium' variant='primary' icon={<Star class='h-3 w-3' />} />
      <Badge label='Team' variant='secondary' icon={<Users class='h-3 w-3' />} />
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div class='flex flex-wrap gap-2'>
      <Badge label='Primary' variant='primary' />
      <Badge label='Secondary' variant='secondary' />
      <Badge label='Success' variant='success' />
      <Badge label='Danger' variant='danger' />
      <Badge label='Warning' variant='warning' />
      <Badge label='Info' variant='info' />
      <Badge label='Light' variant='light' />
      <Badge label='Dark' variant='dark' />
    </div>
  ),
}

export const Rounded: Story = {
  render: () => (
    <div class='flex flex-wrap gap-2'>
      <Badge label='Normal' variant='primary' />
      <Badge label='Rounded' variant='primary' rounded />
      <Badge label='Success' variant='success' rounded />
      <Badge label='Warning' variant='warning' rounded />
    </div>
  ),
}

export const StatusBadges: Story = {
  render: () => (
    <div class='space-y-4'>
      <div class='flex flex-wrap gap-2'>
        <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Connection Status:</span>
        <Badge label='Online' variant='success' icon={<Check class='h-3 w-3' />} />
        <Badge label='Offline' variant='danger' icon={<X class='h-3 w-3' />} />
        <Badge label='Connecting' variant='warning' icon={<Clock class='h-3 w-3' />} />
      </div>
      <div class='flex flex-wrap gap-2'>
        <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Security Level:</span>
        <Badge label='Secure' variant='success' icon={<Shield class='h-3 w-3' />} rounded />
        <Badge label='Encrypted' variant='info' icon={<Shield class='h-3 w-3' />} rounded />
        <Badge label='Public' variant='warning' icon={<AlertTriangle class='h-3 w-3' />} rounded />
      </div>
    </div>
  ),
}

export const FileTypeBadges: Story = {
  render: () => (
    <div class='space-y-2'>
      <div class='flex items-center gap-2'>
        <span class='text-sm text-gray-600 dark:text-gray-400'>document.pdf</span>
        <Badge label='PDF' variant='danger' />
      </div>
      <div class='flex items-center gap-2'>
        <span class='text-sm text-gray-600 dark:text-gray-400'>image.jpg</span>
        <Badge label='IMAGE' variant='info' />
      </div>
      <div class='flex items-center gap-2'>
        <span class='text-sm text-gray-600 dark:text-gray-400'>archive.zip</span>
        <Badge label='ARCHIVE' variant='warning' />
      </div>
      <div class='flex items-center gap-2'>
        <span class='text-sm text-gray-600 dark:text-gray-400'>data.json</span>
        <Badge label='JSON' variant='success' />
      </div>
    </div>
  ),
}

export const NotificationBadges: Story = {
  render: () => (
    <div class='space-y-4'>
      <div class='flex items-center gap-2'>
        <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Messages</span>
        <Badge label='3' variant='danger' rounded />
      </div>
      <div class='flex items-center gap-2'>
        <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Updates</span>
        <Badge label='12' variant='primary' rounded />
      </div>
      <div class='flex items-center gap-2'>
        <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Tasks</span>
        <Badge label='5' variant='success' rounded />
      </div>
    </div>
  ),
}

export const CustomStyling: Story = {
  args: {
    label: 'Custom',
    variant: 'primary',
    class: 'text-lg px-4 py-2 shadow-lg',
  },
}

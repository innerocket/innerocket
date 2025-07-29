import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Card, CardSection } from './Card'
import { Button } from './Button'
import { Settings, User, FileText } from 'lucide-solid'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: { type: 'text' },
    },
    subtitle: {
      control: { type: 'text' },
    },
    class: {
      control: { type: 'text' },
    },
  },
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    title: 'Card Title',
    subtitle: 'This is a subtitle',
    children: (
      <p class='text-gray-600 dark:text-gray-300'>
        This is the main content of the card. It can contain any JSX elements.
      </p>
    ),
  },
}

export const WithoutHeader: Story = {
  args: {
    children: (
      <div>
        <h3 class='mb-2 text-lg font-semibold text-gray-900 dark:text-white'>
          Content without header
        </h3>
        <p class='text-gray-600 dark:text-gray-300'>
          This card doesn't have a header section, just body content.
        </p>
      </div>
    ),
  },
}

export const WithFooter: Story = {
  args: {
    title: 'Card with Footer',
    subtitle: 'This card includes a footer section',
    children: <p class='text-gray-600 dark:text-gray-300'>Main content goes here.</p>,
    footer: (
      <div class='flex gap-2'>
        <Button size='sm' variant='primary'>
          Save
        </Button>
        <Button size='sm' variant='secondary'>
          Cancel
        </Button>
      </div>
    ),
  },
}

export const WithIcon: Story = {
  args: {
    title: (
      <div class='flex items-center gap-2'>
        <Settings class='h-5 w-5' />
        <span>Settings</span>
      </div>
    ),
    subtitle: 'Manage your preferences',
    children: (
      <div class='space-y-4'>
        <div class='flex items-center justify-between'>
          <span class='text-sm text-gray-600 dark:text-gray-300'>Dark mode</span>
          <span class='text-sm text-blue-600'>Enabled</span>
        </div>
        <div class='flex items-center justify-between'>
          <span class='text-sm text-gray-600 dark:text-gray-300'>Notifications</span>
          <span class='text-sm text-blue-600'>On</span>
        </div>
      </div>
    ),
  },
}

export const UserProfile: Story = {
  args: {
    title: (
      <div class='flex items-center gap-3'>
        <div class='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900'>
          <User class='h-5 w-5 text-blue-600 dark:text-blue-400' />
        </div>
        <div>
          <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>John Doe</h3>
          <p class='text-sm text-gray-500 dark:text-gray-400'>Software Engineer</p>
        </div>
      </div>
    ),
    children: (
      <div class='space-y-3'>
        <div>
          <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Email:</span>
          <span class='ml-2 text-sm text-gray-600 dark:text-gray-400'>john.doe@example.com</span>
        </div>
        <div>
          <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Location:</span>
          <span class='ml-2 text-sm text-gray-600 dark:text-gray-400'>San Francisco, CA</span>
        </div>
        <div>
          <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>Joined:</span>
          <span class='ml-2 text-sm text-gray-600 dark:text-gray-400'>January 2023</span>
        </div>
      </div>
    ),
    footer: (
      <div class='flex gap-2'>
        <Button size='sm' variant='primary'>
          Edit Profile
        </Button>
        <Button size='sm' variant='ghost'>
          View Details
        </Button>
      </div>
    ),
  },
}

export const WithCardSections: Story = {
  args: {
    title: 'Project Overview',
    subtitle: 'Multiple sections within a card',
    children: (
      <div>
        <CardSection title='Recent Files'>
          <div class='space-y-2'>
            <div class='flex items-center gap-2 rounded bg-gray-50 p-2 dark:bg-gray-700'>
              <FileText class='h-4 w-4 text-gray-500' />
              <span class='text-sm'>document.pdf</span>
            </div>
            <div class='flex items-center gap-2 rounded bg-gray-50 p-2 dark:bg-gray-700'>
              <FileText class='h-4 w-4 text-gray-500' />
              <span class='text-sm'>presentation.pptx</span>
            </div>
          </div>
        </CardSection>
        <CardSection title='Statistics'>
          <div class='grid grid-cols-2 gap-4'>
            <div class='text-center'>
              <div class='text-2xl font-bold text-blue-600'>24</div>
              <div class='text-xs text-gray-500'>Files</div>
            </div>
            <div class='text-center'>
              <div class='text-2xl font-bold text-green-600'>98%</div>
              <div class='text-xs text-gray-500'>Uptime</div>
            </div>
          </div>
        </CardSection>
      </div>
    ),
  },
}

export const CustomStyling: Story = {
  args: {
    title: 'Custom Styled Card',
    subtitle: 'With custom classes applied',
    class: 'shadow-lg hover:shadow-xl border-blue-200 dark:border-blue-800',
    headerClass: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900 dark:to-indigo-900',
    bodyClass: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900',
    children: (
      <p class='text-gray-600 dark:text-gray-300'>
        This card has custom styling applied to demonstrate the flexibility of the component.
      </p>
    ),
    footer: (
      <Button variant='primary' size='sm'>
        Action
      </Button>
    ),
  },
}

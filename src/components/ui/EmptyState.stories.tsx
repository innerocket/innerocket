import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { EmptyState } from './EmptyState'
import { Button } from './Button'
import {
  FileX,
  Users,
  Mail,
  Search,
  Wifi,
  Download,
  FolderOpen,
  MessageSquare,
  Bell,
  Heart,
  Star,
  Calendar,
  Image,
  Archive,
  Database,
  ShoppingCart,
} from 'lucide-solid'

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
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
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    icon: <FileX class='h-6 w-6 text-gray-400' />,
    title: 'No files found',
    subtitle: 'No files have been uploaded yet',
  },
}

export const WithAction: Story = {
  args: {
    icon: <FolderOpen class='h-6 w-6 text-gray-400' />,
    title: 'No files found',
    subtitle: 'Get started by uploading your first file',
    children: (
      <Button variant='primary' size='sm'>
        Upload File
      </Button>
    ),
  },
}

export const NoUsers: Story = {
  args: {
    icon: <Users class='h-6 w-6 text-gray-400' />,
    title: 'No users connected',
    subtitle: 'Share your connection code to invite others',
    children: (
      <div class='flex gap-2'>
        <Button variant='primary' size='sm'>
          Share Code
        </Button>
        <Button variant='secondary' size='sm'>
          Generate QR
        </Button>
      </div>
    ),
  },
}

export const NoMessages: Story = {
  args: {
    icon: <MessageSquare class='h-6 w-6 text-gray-400' />,
    title: 'No messages',
    subtitle: 'Start a conversation with someone',
    children: (
      <Button variant='primary' size='sm'>
        Start Chat
      </Button>
    ),
  },
}

export const NoNotifications: Story = {
  args: {
    icon: <Bell class='h-6 w-6 text-gray-400' />,
    title: 'No notifications',
    subtitle: "You're all caught up!",
  },
}

export const NoSearchResults: Story = {
  args: {
    icon: <Search class='h-6 w-6 text-gray-400' />,
    title: 'No results found',
    subtitle: 'Try adjusting your search terms',
    children: (
      <Button variant='secondary' size='sm'>
        Clear Search
      </Button>
    ),
  },
}

export const OfflineState: Story = {
  args: {
    icon: <Wifi class='h-6 w-6 text-gray-400' />,
    title: "You're offline",
    subtitle: 'Check your internet connection and try again',
    children: (
      <Button variant='primary' size='sm'>
        Retry Connection
      </Button>
    ),
  },
}

export const NoDownloads: Story = {
  args: {
    icon: <Download class='h-6 w-6 text-gray-400' />,
    title: 'No downloads',
    subtitle: 'Your downloaded files will appear here',
  },
}

export const EmptyCart: Story = {
  args: {
    icon: <ShoppingCart class='h-6 w-6 text-gray-400' />,
    title: 'Your cart is empty',
    subtitle: 'Add some items to get started',
    children: (
      <Button variant='primary' size='sm'>
        Browse Products
      </Button>
    ),
  },
}

export const NoFavorites: Story = {
  args: {
    icon: <Heart class='h-6 w-6 text-gray-400' />,
    title: 'No favorites yet',
    subtitle: 'Items you favorite will appear here',
    children: (
      <Button variant='secondary' size='sm'>
        Explore Items
      </Button>
    ),
  },
}

export const NoReviews: Story = {
  args: {
    icon: <Star class='h-6 w-6 text-gray-400' />,
    title: 'No reviews yet',
    subtitle: 'Be the first to leave a review',
    children: (
      <Button variant='primary' size='sm'>
        Write Review
      </Button>
    ),
  },
}

export const NoEvents: Story = {
  args: {
    icon: <Calendar class='h-6 w-6 text-gray-400' />,
    title: 'No events scheduled',
    subtitle: 'Your calendar is empty for this period',
    children: (
      <Button variant='primary' size='sm'>
        Create Event
      </Button>
    ),
  },
}

export const NoImages: Story = {
  args: {
    icon: <Image class='h-6 w-6 text-gray-400' />,
    title: 'No images',
    subtitle: 'Upload images to view them here',
    children: (
      <div class='flex gap-2'>
        <Button variant='primary' size='sm'>
          Upload Images
        </Button>
        <Button variant='secondary' size='sm'>
          Browse Gallery
        </Button>
      </div>
    ),
  },
}

export const NoArchives: Story = {
  args: {
    icon: <Archive class='h-6 w-6 text-gray-400' />,
    title: 'No archived items',
    subtitle: 'Archived items will be stored here',
  },
}

export const DatabaseEmpty: Story = {
  args: {
    icon: <Database class='h-6 w-6 text-gray-400' />,
    title: 'Database is empty',
    subtitle: 'No records found in the database',
    children: (
      <div class='flex gap-2'>
        <Button variant='primary' size='sm'>
          Import Data
        </Button>
        <Button variant='secondary' size='sm'>
          Create Record
        </Button>
      </div>
    ),
  },
}

export const MailboxEmpty: Story = {
  args: {
    icon: <Mail class='h-6 w-6 text-gray-400' />,
    title: 'Inbox empty',
    subtitle: 'No new messages to display',
    children: (
      <Button variant='secondary' size='sm'>
        Compose Message
      </Button>
    ),
  },
}

export const LoadingState: Story = {
  render: () => (
    <div class='w-96 space-y-6'>
      <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>Different States</h3>

      <div class='space-y-4'>
        <EmptyState
          icon={<FileX class='h-6 w-6 text-gray-400' />}
          title='Loading files...'
          subtitle='Please wait while we fetch your files'
        />

        <EmptyState
          icon={<Users class='h-6 w-6 text-gray-400' />}
          title='Connecting to peers...'
          subtitle='Establishing secure connections'
        />

        <EmptyState
          icon={<Download class='h-6 w-6 text-gray-400' />}
          title='Preparing download...'
          subtitle='Getting your files ready'
        />
      </div>
    </div>
  ),
}

export const ErrorStates: Story = {
  render: () => (
    <div class='w-96 space-y-6'>
      <h3 class='text-lg font-semibold text-gray-900 dark:text-white'>Error States</h3>

      <div class='space-y-4'>
        <EmptyState
          icon={<FileX class='h-6 w-6 text-red-400' />}
          title='Failed to load files'
          subtitle='Something went wrong while loading your files'
        >
          <Button variant='danger' size='sm'>
            Try Again
          </Button>
        </EmptyState>

        <EmptyState
          icon={<Wifi class='h-6 w-6 text-orange-400' />}
          title='Connection lost'
          subtitle='Unable to connect to the server'
        >
          <Button variant='warning' size='sm'>
            Reconnect
          </Button>
        </EmptyState>
      </div>
    </div>
  ),
}

export const MultipleActions: Story = {
  args: {
    icon: <FolderOpen class='h-6 w-6 text-gray-400' />,
    title: 'No projects found',
    subtitle: 'Create your first project to get started',
    children: (
      <div class='flex flex-col gap-2 sm:flex-row'>
        <Button variant='primary' size='sm'>
          Create Project
        </Button>
        <Button variant='secondary' size='sm'>
          Import Project
        </Button>
        <Button variant='ghost' size='sm'>
          Browse Templates
        </Button>
      </div>
    ),
  },
}

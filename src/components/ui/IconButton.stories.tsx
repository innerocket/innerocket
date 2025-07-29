import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { IconButton } from './IconButton'
import {
  Heart,
  Star,
  Settings,
  Trash2,
  Edit,
  Download,
  Share,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Menu,
  Bell,
} from 'lucide-solid'

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: [
        'primary',
        'secondary',
        'success',
        'danger',
        'warning',
        'info',
        'light',
        'dark',
        'ghost',
      ],
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    rounded: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    isLoading: {
      control: { type: 'boolean' },
    },
    ariaLabel: {
      control: { type: 'text' },
    },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    icon: <Heart />,
    ariaLabel: 'Like',
  },
}

export const Primary: Story = {
  args: {
    icon: <Star />,
    variant: 'primary',
    ariaLabel: 'Favorite',
  },
}

export const Danger: Story = {
  args: {
    icon: <Trash2 />,
    variant: 'danger',
    ariaLabel: 'Delete',
  },
}

export const Loading: Story = {
  args: {
    icon: <Download />,
    variant: 'primary',
    isLoading: true,
    ariaLabel: 'Download',
  },
}

export const Disabled: Story = {
  args: {
    icon: <Edit />,
    variant: 'secondary',
    disabled: true,
    ariaLabel: 'Edit',
  },
}

export const Variants: Story = {
  render: () => (
    <div class='flex flex-wrap gap-2'>
      <IconButton icon={<Heart />} variant='primary' ariaLabel='Primary' />
      <IconButton icon={<Star />} variant='secondary' ariaLabel='Secondary' />
      <IconButton icon={<Settings />} variant='success' ariaLabel='Success' />
      <IconButton icon={<Trash2 />} variant='danger' ariaLabel='Danger' />
      <IconButton icon={<Edit />} variant='warning' ariaLabel='Warning' />
      <IconButton icon={<Download />} variant='info' ariaLabel='Info' />
      <IconButton icon={<Share />} variant='light' ariaLabel='Light' />
      <IconButton icon={<Plus />} variant='dark' ariaLabel='Dark' />
      <IconButton icon={<X />} variant='ghost' ariaLabel='Ghost' />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div class='flex items-center gap-2'>
      <IconButton icon={<Heart />} size='xs' ariaLabel='Extra Small' />
      <IconButton icon={<Heart />} size='sm' ariaLabel='Small' />
      <IconButton icon={<Heart />} size='md' ariaLabel='Medium' />
      <IconButton icon={<Heart />} size='lg' ariaLabel='Large' />
      <IconButton icon={<Heart />} size='xl' ariaLabel='Extra Large' />
    </div>
  ),
}

export const Rounded: Story = {
  render: () => (
    <div class='flex items-center gap-2'>
      <IconButton icon={<Heart />} variant='primary' ariaLabel='Square' />
      <IconButton icon={<Heart />} variant='primary' rounded ariaLabel='Rounded' />
      <IconButton icon={<Star />} variant='success' ariaLabel='Square' />
      <IconButton icon={<Star />} variant='success' rounded ariaLabel='Rounded' />
    </div>
  ),
}

export const ActionButtons: Story = {
  render: () => (
    <div class='flex gap-2'>
      <IconButton
        icon={<Edit />}
        variant='secondary'
        ariaLabel='Edit'
        onClick={() => alert('Edit clicked')}
      />
      <IconButton
        icon={<Download />}
        variant='primary'
        ariaLabel='Download'
        onClick={() => alert('Download clicked')}
      />
      <IconButton
        icon={<Share />}
        variant='success'
        ariaLabel='Share'
        onClick={() => alert('Share clicked')}
      />
      <IconButton
        icon={<Trash2 />}
        variant='danger'
        ariaLabel='Delete'
        onClick={() => alert('Delete clicked')}
      />
    </div>
  ),
}

export const NavigationButtons: Story = {
  render: () => (
    <div class='flex items-center gap-2'>
      <IconButton
        icon={<ChevronLeft />}
        variant='ghost'
        ariaLabel='Previous'
        onClick={() => alert('Previous clicked')}
      />
      <IconButton
        icon={<Home />}
        variant='ghost'
        ariaLabel='Home'
        onClick={() => alert('Home clicked')}
      />
      <IconButton
        icon={<ChevronRight />}
        variant='ghost'
        ariaLabel='Next'
        onClick={() => alert('Next clicked')}
      />
    </div>
  ),
}

export const HeaderActions: Story = {
  render: () => (
    <div class='flex items-center gap-2 rounded-lg bg-gray-50 p-4 dark:bg-gray-800'>
      <IconButton icon={<Menu />} variant='ghost' ariaLabel='Menu' size='sm' />
      <div class='flex-1 text-center'>
        <h2 class='text-lg font-semibold text-gray-900 dark:text-white'>Header Title</h2>
      </div>
      <IconButton icon={<Search />} variant='ghost' ariaLabel='Search' size='sm' />
      <IconButton icon={<Bell />} variant='ghost' ariaLabel='Notifications' size='sm' />
      <IconButton icon={<Settings />} variant='ghost' ariaLabel='Settings' size='sm' />
    </div>
  ),
}

export const FloatingActionButton: Story = {
  render: () => (
    <div class='relative h-32 w-32 rounded-lg bg-gray-100 dark:bg-gray-800'>
      <div class='absolute right-4 bottom-4'>
        <IconButton
          icon={<Plus />}
          variant='primary'
          size='lg'
          rounded
          ariaLabel='Add new item'
          class='shadow-lg hover:shadow-xl'
        />
      </div>
    </div>
  ),
}

export const ButtonGroup: Story = {
  render: () => (
    <div class='inline-flex overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700'>
      <IconButton
        icon={<ChevronLeft />}
        variant='ghost'
        ariaLabel='Previous'
        class='rounded-none border-r border-gray-200 dark:border-gray-700'
      />
      <IconButton
        icon={<Home />}
        variant='ghost'
        ariaLabel='Home'
        class='rounded-none border-r border-gray-200 dark:border-gray-700'
      />
      <IconButton icon={<ChevronRight />} variant='ghost' ariaLabel='Next' class='rounded-none' />
    </div>
  ),
}

export const WithTooltip: Story = {
  args: {
    icon: <Heart />,
    variant: 'primary',
    ariaLabel: 'Add to favorites',
    title: 'Add to favorites',
  },
}

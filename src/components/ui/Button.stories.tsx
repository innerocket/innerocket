import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Button } from './Button'
import { Plus } from 'lucide-solid'

const meta = {
  title: 'UI/Button',
  component: Button,
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
    fullWidth: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
    isLoading: {
      control: { type: 'boolean' },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: {
    children: 'Primary Button',
    variant: 'primary',
  },
}

export const Secondary: Story = {
  args: {
    children: 'Secondary Button',
    variant: 'secondary',
  },
}

export const Success: Story = {
  args: {
    children: 'Success Button',
    variant: 'success',
  },
}

export const Danger: Story = {
  args: {
    children: 'Danger Button',
    variant: 'danger',
  },
}

export const WithIcon: Story = {
  args: {
    children: 'With Icon',
    icon: <Plus class='h-4 w-4' />,
    variant: 'primary',
  },
}

export const Loading: Story = {
  args: {
    children: 'Loading Button',
    isLoading: true,
    variant: 'primary',
  },
}

export const Disabled: Story = {
  args: {
    children: 'Disabled Button',
    disabled: true,
    variant: 'primary',
  },
}

export const Sizes: Story = {
  render: () => (
    <div class='flex items-center gap-4'>
      <Button size='xs'>Extra Small</Button>
      <Button size='sm'>Small</Button>
      <Button size='md'>Medium</Button>
      <Button size='lg'>Large</Button>
      <Button size='xl'>Extra Large</Button>
    </div>
  ),
}

export const Variants: Story = {
  render: () => (
    <div class='grid grid-cols-3 gap-4'>
      <Button variant='primary'>Primary</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='success'>Success</Button>
      <Button variant='danger'>Danger</Button>
      <Button variant='warning'>Warning</Button>
      <Button variant='info'>Info</Button>
      <Button variant='light'>Light</Button>
      <Button variant='dark'>Dark</Button>
      <Button variant='ghost'>Ghost</Button>
    </div>
  ),
}

export const FullWidth: Story = {
  args: {
    children: 'Full Width Button',
    fullWidth: true,
    variant: 'primary',
  },
}

export const WithClickHandler: Story = {
  args: {
    children: 'Click Me',
    variant: 'primary',
    onClick: () => alert('Button clicked!'),
  },
}

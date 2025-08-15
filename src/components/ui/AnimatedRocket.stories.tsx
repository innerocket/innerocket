import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { AnimatedRocket } from './AnimatedRocket'

const meta = {
  title: 'UI/AnimatedRocket',
  component: AnimatedRocket,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
    },
    animation: {
      control: { type: 'select' },
      options: ['none', 'bounce', 'pulse', 'spin', 'ping'],
    },
    trajectory: {
      control: { type: 'select' },
      options: ['straight', 'arc', 'spiral'],
    },
    autoLaunch: {
      control: { type: 'boolean' },
    },
    launchDuration: {
      control: { type: 'number', min: 1000, max: 5000, step: 500 },
    },
    color: {
      control: { type: 'color' },
    },
    loop: {
      control: { type: 'boolean' },
    },
    loopDelay: {
      control: { type: 'number', min: 500, max: 5000, step: 500 },
    },
  },
} satisfies Meta<typeof AnimatedRocket>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    size: 'md',
    animation: 'none',
    trajectory: 'straight',
    launchDuration: 3000,
  },
}

export const Small: Story = {
  args: {
    size: 'sm',
    animation: 'bounce',
    trajectory: 'straight',
  },
}

export const Large: Story = {
  args: {
    size: 'lg',
    animation: 'pulse',
    trajectory: 'arc',
  },
}

export const ExtraLarge: Story = {
  args: {
    size: 'xl',
    animation: 'none',
    trajectory: 'spiral',
  },
}

export const AutoLaunch: Story = {
  args: {
    size: 'md',
    autoLaunch: true,
    trajectory: 'straight',
    launchDuration: 2000,
  },
}

export const LoopingRocket: Story = {
  args: {
    size: 'lg',
    autoLaunch: true,
    loop: true,
    trajectory: 'arc',
    launchDuration: 2500,
    loopDelay: 1500,
  },
}

export const FastLoop: Story = {
  args: {
    size: 'md',
    autoLaunch: true,
    loop: true,
    trajectory: 'straight',
    launchDuration: 1500,
    loopDelay: 1000,
  },
}

export const ArcTrajectory: Story = {
  args: {
    size: 'lg',
    trajectory: 'arc',
    animation: 'none',
    launchDuration: 4000,
  },
}

export const SpiralTrajectory: Story = {
  args: {
    size: 'lg',
    trajectory: 'spiral',
    animation: 'none',
    launchDuration: 3500,
  },
}

export const FastLaunch: Story = {
  args: {
    size: 'md',
    trajectory: 'straight',
    launchDuration: 1500,
  },
}

export const SlowLaunch: Story = {
  args: {
    size: 'md',
    trajectory: 'arc',
    launchDuration: 5000,
  },
}

export const CustomColor: Story = {
  args: {
    size: 'lg',
    color: '#ff6b35',
    trajectory: 'straight',
    animation: 'pulse',
  },
}

export const WithBounceAnimation: Story = {
  args: {
    size: 'md',
    animation: 'bounce',
    trajectory: 'straight',
  },
}

export const WithSpinAnimation: Story = {
  args: {
    size: 'md',
    animation: 'spin',
    trajectory: 'arc',
  },
}

export const AllSizes: Story = {
  render: () => (
    <div class='flex items-center gap-8'>
      <div class='text-center'>
        <AnimatedRocket size='sm' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Small</p>
      </div>
      <div class='text-center'>
        <AnimatedRocket size='md' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Medium</p>
      </div>
      <div class='text-center'>
        <AnimatedRocket size='lg' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Large</p>
      </div>
      <div class='text-center'>
        <AnimatedRocket size='xl' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Extra Large</p>
      </div>
    </div>
  ),
}

export const AllTrajectories: Story = {
  render: () => (
    <div class='flex items-center gap-8'>
      <div class='text-center'>
        <AnimatedRocket size='lg' trajectory='straight' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Straight</p>
      </div>
      <div class='text-center'>
        <AnimatedRocket size='lg' trajectory='arc' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Arc</p>
      </div>
      <div class='text-center'>
        <AnimatedRocket size='lg' trajectory='spiral' />
        <p class='mt-2 text-xs text-gray-600 dark:text-gray-400'>Spiral</p>
      </div>
    </div>
  ),
}

export const ColorVariations: Story = {
  render: () => (
    <div class='flex items-center gap-6'>
      <AnimatedRocket size='lg' color='#3b82f6' />
      <AnimatedRocket size='lg' color='#ef4444' />
      <AnimatedRocket size='lg' color='#10b981' />
      <AnimatedRocket size='lg' color='#f59e0b' />
      <AnimatedRocket size='lg' color='#8b5cf6' />
    </div>
  ),
}

export const Interactive: Story = {
  render: () => (
    <div class='p-8 text-center'>
      <h3 class='mb-4 text-lg font-medium text-gray-900 dark:text-gray-100'>
        Click the rocket to launch!
      </h3>
      <AnimatedRocket size='xl' trajectory='spiral' launchDuration={4000} />
      <p class='mt-4 text-sm text-gray-600 dark:text-gray-400'>
        Try different trajectories!
      </p>
    </div>
  ),
}

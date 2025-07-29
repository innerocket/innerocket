import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Input } from './Input'
import { Mail, Search, Eye, EyeOff, User, Lock } from 'lucide-solid'
import { createSignal } from 'solid-js'

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: { type: 'text' },
    },
    error: {
      control: { type: 'text' },
    },
    hint: {
      control: { type: 'text' },
    },
    placeholder: {
      control: { type: 'text' },
    },
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
    },
    fullWidth: {
      control: { type: 'boolean' },
    },
    disabled: {
      control: { type: 'boolean' },
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  args: {
    placeholder: 'Enter text...',
  },
}

export const WithLabel: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
}

export const WithError: Story = {
  args: {
    label: 'Username',
    placeholder: 'Enter username',
    error: 'Username is required',
    value: '',
  },
}

export const WithHint: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password',
    type: 'password',
    hint: 'Password must be at least 8 characters long',
  },
}

export const WithLeftIcon: Story = {
  args: {
    label: 'Search',
    placeholder: 'Search files...',
    icon: <Search class='h-4 w-4' />,
  },
}

export const WithRightIcon: Story = {
  args: {
    label: 'Email',
    placeholder: 'Enter email',
    type: 'email',
    rightIcon: <Mail class='h-4 w-4' />,
  },
}

export const PasswordToggle: Story = {
  render: () => {
    const [showPassword, setShowPassword] = createSignal(false)

    return (
      <Input
        label='Password'
        placeholder='Enter password'
        type={showPassword() ? 'text' : 'password'}
        rightIcon={showPassword() ? <EyeOff class='h-4 w-4' /> : <Eye class='h-4 w-4' />}
        onRightIconClick={() => setShowPassword(!showPassword())}
      />
    )
  },
}

export const LoginForm: Story = {
  render: () => (
    <div class='w-80 space-y-4'>
      <Input
        label='Username'
        placeholder='Enter username'
        icon={<User class='h-4 w-4' />}
        fullWidth
      />
      <Input
        label='Password'
        placeholder='Enter password'
        type='password'
        icon={<Lock class='h-4 w-4' />}
        fullWidth
      />
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div class='w-80 space-y-4'>
      <Input label='Normal State' placeholder='Normal input' fullWidth />
      <Input label='Disabled State' placeholder='Disabled input' disabled fullWidth />
      <Input
        label='Error State'
        placeholder='Input with error'
        error='This field is required'
        fullWidth
      />
      <Input
        label='With Hint'
        placeholder='Input with hint'
        hint='This is a helpful hint'
        fullWidth
      />
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div class='space-y-4'>
      <Input placeholder='Default size input' />
      <Input placeholder='Full width input' fullWidth />
    </div>
  ),
}

export const Types: Story = {
  render: () => (
    <div class='w-80 space-y-4'>
      <Input label='Text Input' type='text' placeholder='Enter text' fullWidth />
      <Input
        label='Email Input'
        type='email'
        placeholder='Enter email'
        icon={<Mail class='h-4 w-4' />}
        fullWidth
      />
      <Input
        label='Password Input'
        type='password'
        placeholder='Enter password'
        icon={<Lock class='h-4 w-4' />}
        fullWidth
      />
      <Input label='Number Input' type='number' placeholder='Enter number' fullWidth />
      <Input label='URL Input' type='url' placeholder='https://example.com' fullWidth />
    </div>
  ),
}

export const WithValidation: Story = {
  render: () => {
    const [email, setEmail] = createSignal('')
    const [error, setError] = createSignal('')

    const validateEmail = (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!value) {
        setError('Email is required')
      } else if (!emailRegex.test(value)) {
        setError('Please enter a valid email address')
      } else {
        setError('')
      }
    }

    return (
      <Input
        label='Email Validation'
        placeholder='Enter your email'
        type='email'
        value={email()}
        onInput={e => {
          const value = e.currentTarget.value
          setEmail(value)
          validateEmail(value)
        }}
        error={error()}
        icon={<Mail class='h-4 w-4' />}
        fullWidth
      />
    )
  },
}

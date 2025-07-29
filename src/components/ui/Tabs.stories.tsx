import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { TabsProvider, TabList, TabButton, TabContent } from './Tabs'
import { createSignal } from 'solid-js'
import { Card } from './Card'
import { Button } from './Button'
import { Badge } from './Badge'
import {
  Home,
  Settings,
  User,
  Bell,
  FileText,
  BarChart3,
  Shield,
  Mail,
  Calendar,
  Globe,
} from 'lucide-solid'

const meta = {
  title: 'UI/Tabs',
  component: TabsProvider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TabsProvider>

export default meta
type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => {
    const [activeTab, setActiveTab] = createSignal('tab1')

    return (
      <div class='w-96'>
        <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
          <TabList>
            <TabButton value='tab1'>Tab 1</TabButton>
            <TabButton value='tab2'>Tab 2</TabButton>
            <TabButton value='tab3'>Tab 3</TabButton>
          </TabList>

          <TabContent value='tab1'>
            <p class='text-gray-600 dark:text-gray-300'>This is the content for Tab 1.</p>
          </TabContent>

          <TabContent value='tab2'>
            <p class='text-gray-600 dark:text-gray-300'>This is the content for Tab 2.</p>
          </TabContent>

          <TabContent value='tab3'>
            <p class='text-gray-600 dark:text-gray-300'>This is the content for Tab 3.</p>
          </TabContent>
        </TabsProvider>
      </div>
    )
  },
}

export const WithIcons: Story = {
  render: () => {
    const [activeTab, setActiveTab] = createSignal('home')

    return (
      <div class='w-96'>
        <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
          <TabList>
            <TabButton value='home'>
              <div class='flex items-center gap-2'>
                <Home class='h-4 w-4' />
                <span>Home</span>
              </div>
            </TabButton>
            <TabButton value='profile'>
              <div class='flex items-center gap-2'>
                <User class='h-4 w-4' />
                <span>Profile</span>
              </div>
            </TabButton>
            <TabButton value='settings'>
              <div class='flex items-center gap-2'>
                <Settings class='h-4 w-4' />
                <span>Settings</span>
              </div>
            </TabButton>
          </TabList>

          <TabContent value='home'>
            <Card title='Welcome Home' subtitle='Your dashboard overview'>
              <p class='text-gray-600 dark:text-gray-300'>
                Here's your home dashboard with recent activity and quick actions.
              </p>
            </Card>
          </TabContent>

          <TabContent value='profile'>
            <Card title='User Profile' subtitle='Manage your personal information'>
              <div class='space-y-4'>
                <div>
                  <label class='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Name
                  </label>
                  <p class='text-gray-600 dark:text-gray-400'>John Doe</p>
                </div>
                <div>
                  <label class='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Email
                  </label>
                  <p class='text-gray-600 dark:text-gray-400'>john@example.com</p>
                </div>
              </div>
            </Card>
          </TabContent>

          <TabContent value='settings'>
            <Card title='Application Settings' subtitle='Configure your preferences'>
              <div class='space-y-4'>
                <div class='flex items-center justify-between'>
                  <span class='text-sm text-gray-700 dark:text-gray-300'>Dark Mode</span>
                  <Badge label='Enabled' variant='success' />
                </div>
                <div class='flex items-center justify-between'>
                  <span class='text-sm text-gray-700 dark:text-gray-300'>Notifications</span>
                  <Badge label='On' variant='primary' />
                </div>
              </div>
            </Card>
          </TabContent>
        </TabsProvider>
      </div>
    )
  },
}

export const WithBadges: Story = {
  render: () => {
    const [activeTab, setActiveTab] = createSignal('inbox')

    return (
      <div class='w-96'>
        <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
          <TabList>
            <TabButton value='inbox'>
              <div class='flex items-center gap-2'>
                <Mail class='h-4 w-4' />
                <span>Inbox</span>
                <Badge label='5' variant='danger' />
              </div>
            </TabButton>
            <TabButton value='notifications'>
              <div class='flex items-center gap-2'>
                <Bell class='h-4 w-4' />
                <span>Notifications</span>
                <Badge label='12' variant='primary' />
              </div>
            </TabButton>
            <TabButton value='calendar'>
              <div class='flex items-center gap-2'>
                <Calendar class='h-4 w-4' />
                <span>Calendar</span>
              </div>
            </TabButton>
          </TabList>

          <TabContent value='inbox'>
            <div class='space-y-3'>
              <div class='rounded bg-gray-50 p-3 dark:bg-gray-700'>
                <h4 class='font-medium text-gray-900 dark:text-white'>New Message</h4>
                <p class='text-sm text-gray-600 dark:text-gray-300'>From: sarah@example.com</p>
              </div>
              <div class='rounded bg-gray-50 p-3 dark:bg-gray-700'>
                <h4 class='font-medium text-gray-900 dark:text-white'>Team Update</h4>
                <p class='text-sm text-gray-600 dark:text-gray-300'>From: team@company.com</p>
              </div>
            </div>
          </TabContent>

          <TabContent value='notifications'>
            <div class='space-y-3'>
              <div class='rounded bg-blue-50 p-3 dark:bg-blue-900/20'>
                <h4 class='font-medium text-blue-900 dark:text-blue-200'>System Update</h4>
                <p class='text-sm text-blue-700 dark:text-blue-300'>App updated to version 2.1.0</p>
              </div>
              <div class='rounded bg-green-50 p-3 dark:bg-green-900/20'>
                <h4 class='font-medium text-green-900 dark:text-green-200'>Backup Complete</h4>
                <p class='text-sm text-green-700 dark:text-green-300'>
                  Your data has been backed up successfully
                </p>
              </div>
            </div>
          </TabContent>

          <TabContent value='calendar'>
            <div class='space-y-3'>
              <div class='rounded bg-yellow-50 p-3 dark:bg-yellow-900/20'>
                <h4 class='font-medium text-yellow-900 dark:text-yellow-200'>Meeting Today</h4>
                <p class='text-sm text-yellow-700 dark:text-yellow-300'>Team standup at 2:00 PM</p>
              </div>
            </div>
          </TabContent>
        </TabsProvider>
      </div>
    )
  },
}

export const Dashboard: Story = {
  render: () => {
    const [activeTab, setActiveTab] = createSignal('overview')

    return (
      <div class='w-full max-w-4xl'>
        <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
          <TabList>
            <TabButton value='overview'>
              <div class='flex items-center gap-2'>
                <BarChart3 class='h-4 w-4' />
                <span>Overview</span>
              </div>
            </TabButton>
            <TabButton value='analytics'>
              <div class='flex items-center gap-2'>
                <FileText class='h-4 w-4' />
                <span>Analytics</span>
              </div>
            </TabButton>
            <TabButton value='security'>
              <div class='flex items-center gap-2'>
                <Shield class='h-4 w-4' />
                <span>Security</span>
              </div>
            </TabButton>
            <TabButton value='network'>
              <div class='flex items-center gap-2'>
                <Globe class='h-4 w-4' />
                <span>Network</span>
              </div>
            </TabButton>
          </TabList>

          <TabContent value='overview'>
            <div class='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <Card title='Total Users' subtitle='Active user count'>
                <div class='text-3xl font-bold text-blue-600'>1,234</div>
                <p class='text-sm text-green-600'>+12% from last month</p>
              </Card>
              <Card title='Revenue' subtitle='Monthly revenue'>
                <div class='text-3xl font-bold text-green-600'>$45,678</div>
                <p class='text-sm text-green-600'>+8% from last month</p>
              </Card>
            </div>
          </TabContent>

          <TabContent value='analytics'>
            <Card title='Analytics Dashboard' subtitle='Detailed performance metrics'>
              <div class='space-y-4'>
                <div class='flex justify-between'>
                  <span>Page Views</span>
                  <span class='font-bold'>89,432</span>
                </div>
                <div class='flex justify-between'>
                  <span>Unique Visitors</span>
                  <span class='font-bold'>34,567</span>
                </div>
                <div class='flex justify-between'>
                  <span>Bounce Rate</span>
                  <span class='font-bold'>24.5%</span>
                </div>
              </div>
            </Card>
          </TabContent>

          <TabContent value='security'>
            <Card title='Security Settings' subtitle='Manage security preferences'>
              <div class='space-y-4'>
                <div class='flex items-center justify-between'>
                  <span>Two-Factor Authentication</span>
                  <Badge label='Enabled' variant='success' />
                </div>
                <div class='flex items-center justify-between'>
                  <span>SSL Certificate</span>
                  <Badge label='Valid' variant='success' />
                </div>
                <div class='flex items-center justify-between'>
                  <span>Security Scan</span>
                  <Badge label='Pending' variant='warning' />
                </div>
                <Button variant='primary' size='sm'>
                  Run Security Scan
                </Button>
              </div>
            </Card>
          </TabContent>

          <TabContent value='network'>
            <Card title='Network Status' subtitle='Connection and performance'>
              <div class='space-y-4'>
                <div class='flex items-center justify-between'>
                  <span>Connection Status</span>
                  <Badge label='Online' variant='success' />
                </div>
                <div class='flex items-center justify-between'>
                  <span>Latency</span>
                  <span class='text-sm'>45ms</span>
                </div>
                <div class='flex items-center justify-between'>
                  <span>Bandwidth</span>
                  <span class='text-sm'>100 Mbps</span>
                </div>
              </div>
            </Card>
          </TabContent>
        </TabsProvider>
      </div>
    )
  },
}

export const ScrollableTabs: Story = {
  render: () => {
    const [activeTab, setActiveTab] = createSignal('tab1')

    return (
      <div class='w-80'>
        <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
          <TabList>
            <TabButton value='tab1'>Tab One</TabButton>
            <TabButton value='tab2'>Tab Two</TabButton>
            <TabButton value='tab3'>Tab Three</TabButton>
            <TabButton value='tab4'>Tab Four</TabButton>
            <TabButton value='tab5'>Tab Five</TabButton>
            <TabButton value='tab6'>Tab Six</TabButton>
            <TabButton value='tab7'>Tab Seven</TabButton>
          </TabList>

          <TabContent value='tab1'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab One</p>
          </TabContent>
          <TabContent value='tab2'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab Two</p>
          </TabContent>
          <TabContent value='tab3'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab Three</p>
          </TabContent>
          <TabContent value='tab4'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab Four</p>
          </TabContent>
          <TabContent value='tab5'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab Five</p>
          </TabContent>
          <TabContent value='tab6'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab Six</p>
          </TabContent>
          <TabContent value='tab7'>
            <p class='text-gray-600 dark:text-gray-300'>Content for Tab Seven</p>
          </TabContent>
        </TabsProvider>
      </div>
    )
  },
}

export const DynamicContent: Story = {
  render: () => {
    const [activeTab, setActiveTab] = createSignal('stats')
    const [data, setData] = createSignal({
      users: 1234,
      sessions: 5678,
      revenue: 9876,
    })

    const refreshData = () => {
      setData({
        users: Math.floor(Math.random() * 2000) + 1000,
        sessions: Math.floor(Math.random() * 8000) + 4000,
        revenue: Math.floor(Math.random() * 15000) + 8000,
      })
    }

    return (
      <div class='w-96'>
        <TabsProvider activeTab={activeTab()} onTabChange={setActiveTab}>
          <TabList>
            <TabButton value='stats'>Statistics</TabButton>
            <TabButton value='actions'>Actions</TabButton>
          </TabList>

          <TabContent value='stats'>
            <Card title='Live Statistics' subtitle='Real-time data'>
              <div class='space-y-3'>
                <div class='flex justify-between'>
                  <span>Active Users:</span>
                  <span class='font-bold text-blue-600'>{data().users}</span>
                </div>
                <div class='flex justify-between'>
                  <span>Sessions:</span>
                  <span class='font-bold text-green-600'>{data().sessions}</span>
                </div>
                <div class='flex justify-between'>
                  <span>Revenue:</span>
                  <span class='font-bold text-purple-600'>${data().revenue}</span>
                </div>
              </div>
            </Card>
          </TabContent>

          <TabContent value='actions'>
            <Card title='Quick Actions' subtitle='Manage your data'>
              <div class='space-y-3'>
                <Button variant='primary' onClick={refreshData} fullWidth>
                  Refresh Data
                </Button>
                <Button variant='secondary' onClick={() => alert('Export initiated')} fullWidth>
                  Export Report
                </Button>
                <Button variant='success' onClick={() => setActiveTab('stats')} fullWidth>
                  View Statistics
                </Button>
              </div>
            </Card>
          </TabContent>
        </TabsProvider>
      </div>
    )
  },
}

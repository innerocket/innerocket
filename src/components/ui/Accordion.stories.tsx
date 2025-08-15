import type { Meta, StoryObj } from 'storybook-solidjs-vite'
import { Accordion, AccordionItem } from './Accordion'
import { Badge } from './Badge'

const meta = {
  title: 'UI/Accordion',
  component: Accordion,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A collapsible accordion component with support for single or multiple open items.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    multiple: {
      control: { type: 'boolean' },
      description: 'Allow multiple items to be open at once',
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <div class='w-full max-w-md'>
      <Accordion>
        <AccordionItem title='What is InneRocket?' defaultOpen>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            InneRocket is a secure file transfer application that allows you to share files directly
            between devices without going through external servers.
          </p>
        </AccordionItem>
        <AccordionItem title='How does it work?'>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            It uses peer-to-peer connections to transfer files directly between your devices,
            ensuring your data stays private and secure.
          </p>
        </AccordionItem>
        <AccordionItem title='Is it secure?'>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            Yes! All transfers are encrypted end-to-end, and no data passes through our servers.
            Your files go directly from your device to the recipient.
          </p>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const WithSubtitles: Story = {
  render: () => (
    <div class='w-full max-w-md'>
      <Accordion>
        <AccordionItem title='File Transfer' subtitle='Send files securely' defaultOpen>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            Transfer files of any size directly to other devices using our secure P2P protocol.
          </p>
          <div class='mt-3 flex gap-2'>
            <Badge variant='success' label='Encrypted' />
            <Badge variant='info' label='No Size Limit' />
          </div>
        </AccordionItem>
        <AccordionItem title='Privacy Settings' subtitle='Control your data'>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            Configure privacy settings to control who can send you files and how your data is
            handled.
          </p>
        </AccordionItem>
        <AccordionItem title='Connection History' subtitle='View past transfers'>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            Review your connection history and manage trusted devices.
          </p>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const SingleItem: Story = {
  render: () => (
    <div class='w-full max-w-md'>
      <AccordionItem title='Standalone Accordion Item' defaultOpen>
        <div class='space-y-3'>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            This is a single accordion item that can be used independently.
          </p>
          <div class='rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
            <p class='text-sm text-blue-800 dark:text-blue-200'>
              Pro tip: You can use AccordionItem components individually without wrapping them in an
              Accordion.
            </p>
          </div>
        </div>
      </AccordionItem>
    </div>
  ),
}

export const DisabledItem: Story = {
  render: () => (
    <div class='w-full max-w-md'>
      <Accordion>
        <AccordionItem title='Available Feature' defaultOpen>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            This feature is available and can be expanded.
          </p>
        </AccordionItem>
        <AccordionItem title='Coming Soon' subtitle='Feature in development' disabled>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            This content won't be shown since the item is disabled.
          </p>
        </AccordionItem>
        <AccordionItem title='Another Available Feature'>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            This is another feature that works normally.
          </p>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const ComplexContent: Story = {
  render: () => (
    <div class='w-full max-w-lg'>
      <Accordion>
        <AccordionItem title='System Requirements' defaultOpen>
          <div class='space-y-4'>
            <div>
              <h4 class='mb-2 font-medium text-gray-900 dark:text-white'>Supported Platforms</h4>
              <ul class='space-y-1 text-sm text-gray-600 dark:text-gray-300'>
                <li>• macOS 12.0 or later</li>
                <li>• Windows 10 or later</li>
                <li>• Linux (Ubuntu 20.04+)</li>
              </ul>
            </div>
            <div>
              <h4 class='mb-2 font-medium text-gray-900 dark:text-white'>Hardware</h4>
              <ul class='space-y-1 text-sm text-gray-600 dark:text-gray-300'>
                <li>• 4GB RAM minimum</li>
                <li>• 100MB disk space</li>
                <li>• Network connection</li>
              </ul>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title='Troubleshooting'>
          <div class='space-y-3'>
            <div class='rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20'>
              <h5 class='mb-1 font-medium text-yellow-800 dark:text-yellow-200'>
                Connection Issues
              </h5>
              <p class='text-sm text-yellow-700 dark:text-yellow-300'>
                If you're having trouble connecting, check your firewall settings and ensure ports
                3000-3010 are open.
              </p>
            </div>
            <div class='rounded-md bg-red-50 p-3 dark:bg-red-900/20'>
              <h5 class='mb-1 font-medium text-red-800 dark:text-red-200'>Transfer Failed</h5>
              <p class='text-sm text-red-700 dark:text-red-300'>
                Large file transfers may fail on unstable connections. Try splitting large files or
                using a more stable network.
              </p>
            </div>
          </div>
        </AccordionItem>

        <AccordionItem title='Advanced Settings'>
          <div class='space-y-4'>
            <div class='flex items-center justify-between'>
              <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Auto-accept from trusted devices
              </span>
              <Badge variant='success' label='Enabled' />
            </div>
            <div class='flex items-center justify-between'>
              <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Maximum file size
              </span>
              <Badge variant='secondary' label='10GB' />
            </div>
            <div class='flex items-center justify-between'>
              <span class='text-sm font-medium text-gray-700 dark:text-gray-300'>
                Compression level
              </span>
              <Badge variant='info' label='Medium' />
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const CustomTitles: Story = {
  render: () => (
    <div class='w-full max-w-md'>
      <Accordion>
        <AccordionItem
          title={
            <div class='flex items-center gap-2'>
              <div class='h-2 w-2 rounded-full bg-green-500'></div>
              <span>Online Status</span>
            </div>
          }
          defaultOpen
        >
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            Your device is currently online and ready to receive files.
          </p>
        </AccordionItem>

        <AccordionItem
          title={
            <div class='flex w-full items-center justify-between'>
              <span>File Queue</span>
              <Badge variant='primary' label='3 pending' />
            </div>
          }
        >
          <div class='space-y-2'>
            <div class='flex justify-between text-sm'>
              <span class='text-gray-600 dark:text-gray-300'>document.pdf</span>
              <span class='text-blue-600 dark:text-blue-400'>Sending...</span>
            </div>
            <div class='flex justify-between text-sm'>
              <span class='text-gray-600 dark:text-gray-300'>image.jpg</span>
              <span class='text-gray-500 dark:text-gray-400'>Queued</span>
            </div>
            <div class='flex justify-between text-sm'>
              <span class='text-gray-600 dark:text-gray-300'>video.mp4</span>
              <span class='text-gray-500 dark:text-gray-400'>Queued</span>
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const AllOpen: Story = {
  render: () => (
    <div class='w-full max-w-md'>
      <Accordion>
        <AccordionItem title='First Section' defaultOpen>
          <p class='text-sm text-gray-600 dark:text-gray-300'>This is the first section content.</p>
        </AccordionItem>
        <AccordionItem title='Second Section' defaultOpen>
          <p class='text-sm text-gray-600 dark:text-gray-300'>
            This is the second section content.
          </p>
        </AccordionItem>
        <AccordionItem title='Third Section' defaultOpen>
          <p class='text-sm text-gray-600 dark:text-gray-300'>This is the third section content.</p>
        </AccordionItem>
      </Accordion>
    </div>
  ),
}

export const LongContent: Story = {
  render: () => (
    <div class='w-full max-w-lg'>
      <AccordionItem title='Terms and Conditions' subtitle='Please read carefully'>
        <div class='max-h-64 space-y-4 overflow-y-auto text-sm text-gray-600 dark:text-gray-300'>
          <p>
            By using InneRocket, you agree to the following terms and conditions. This software is
            provided "as is" without warranty of any kind, either express or implied.
          </p>
          <p>
            You are responsible for ensuring that your use of this software complies with all
            applicable laws and regulations in your jurisdiction. The developers of InneRocket are
            not responsible for any misuse of the software.
          </p>
          <p>
            File transfers are conducted directly between devices without our servers having access
            to the content. However, you should still exercise caution when sharing sensitive
            information.
          </p>
          <p>
            We reserve the right to update these terms at any time. Continued use of the software
            constitutes acceptance of any changes to these terms.
          </p>
          <p>
            For questions about these terms, please contact our support team through the application
            or visit our website for more information.
          </p>
          <p>
            This software uses various open-source libraries and components. Full attribution and
            license information can be found in the application's about section.
          </p>
        </div>
      </AccordionItem>
    </div>
  ),
}

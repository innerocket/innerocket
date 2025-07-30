import { createSignal, onMount, type Component, For, Show, Switch, Match } from 'solid-js'
import { unzipSync } from 'fflate'
import { File, Folder, ChevronRight, ChevronDown, Eye } from 'lucide-solid'
import { TextPreview } from './TextPreview'

interface ZipPreviewProps {
  file: Blob
}

interface FilePreviewData {
  name: string
  path: string
  blob: Blob
  type: string
}

interface TreeNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children: TreeNode[]
  depth: number
  isOpen?: boolean
  data?: Uint8Array
}

const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

const processZipFiles = (zipFiles: { [path: string]: Uint8Array }): TreeNode[] => {
  const root: TreeNode = {
    name: 'root',
    type: 'folder',
    path: '',
    children: [],
    depth: -1,
  }
  const nodeMap: { [key: string]: TreeNode } = { '': root }

  const sortedPaths = Object.keys(zipFiles).sort((a, b) => a.localeCompare(b))

  for (const filePath of sortedPaths) {
    const pathParts = filePath.replace(/\/$/, '').split('/')
    let parent = root

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      const currentPath = pathParts.slice(0, i + 1).join('/')

      let node = nodeMap[currentPath]

      if (!node) {
        const isFolder = filePath.endsWith('/') || i < pathParts.length - 1
        node = {
          name: part,
          type: isFolder ? 'folder' : 'file',
          path: currentPath,
          children: [],
          depth: i,
          isOpen: false,
          data: !isFolder ? zipFiles[filePath] : undefined,
        }
        nodeMap[currentPath] = node
        parent.children.push(node)
      }
      parent = node
    }
  }
  return root.children
}

const Node: Component<{ 
  node: TreeNode; 
  onToggle: (path: string) => void;
  onPreview: (node: TreeNode) => void;
}> = props => {
  const getPadding = () => ({ 'padding-left': `${props.node.depth * 1.5}rem` })

  const handleClick = () => {
    if (props.node.type === 'folder') {
      props.onToggle(props.node.path)
    } else {
      props.onPreview(props.node)
    }
  }

  return (
    <li>
      <div
        class='flex cursor-pointer items-center rounded-md p-1 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600'
        style={getPadding()}
        onClick={handleClick}
      >
        {props.node.type === 'folder' ? (
          <>
            {props.node.isOpen ? (
              <ChevronDown class='mr-2 h-4 w-4 text-gray-500' />
            ) : (
              <ChevronRight class='mr-2 h-4 w-4 text-gray-500' />
            )}
            <Folder class='mr-2 h-4 w-4 text-yellow-500' />
          </>
        ) : (
          <>
            <File class='mr-2 ml-6 h-4 w-4 text-gray-400' />
          </>
        )}
        <span class='flex-1'>{props.node.name}</span>
        <Show when={props.node.type === 'file'}>
          <Eye class='ml-2 h-3 w-3 text-gray-400 opacity-60' />
        </Show>
      </div>
      <Show when={props.node.type === 'folder' && props.node.isOpen}>
        <ul>
          <For each={props.node.children}>
            {child => <Node node={child} onToggle={props.onToggle} onPreview={props.onPreview} />}
          </For>
        </ul>
      </Show>
    </li>
  )
}

const getFileType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  // Text files
  if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bat', 'ps1', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'log', 'sql', 'r', 'matlab', 'm', 'pl', 'pm', 'lua', 'dart', 'vim', 'gitignore', 'gitconfig', 'dockerfile', 'makefile', 'cmake', 'gradle', 'properties', 'env', 'editorconfig', 'eslintrc', 'prettierrc', 'babelrc', 'tsconfig', 'jsconfig', 'webpack', 'vite', 'rollup', 'package', 'composer', 'cargo', 'gemfile', 'podfile', 'requirements', 'poetry', 'pipfile', 'pyproject', 'setup', 'build', 'ant', 'pom', 'sbt', 'mix', 'rebar', 'deps', 'stack', 'cabal', 'elm', 'purescript', 'clj', 'cljs', 'cljc', 'edn', 'boot', 'lein', 'project', 'shadow', 'bb', 'deps'].includes(ext || '')) {
    return 'text/plain'
  }
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff', 'tif'].includes(ext || '')) {
    return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  }
  
  // Videos
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv', 'm4v', '3gp'].includes(ext || '')) {
    return `video/${ext === 'mov' ? 'quicktime' : ext === 'avi' ? 'x-msvideo' : ext}`
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'].includes(ext || '')) {
    return `audio/${ext === 'm4a' ? 'mp4' : ext}`
  }
  
  // PDF
  if (ext === 'pdf') {
    return 'application/pdf'
  }
  
  return 'application/octet-stream'
}

export const ZipPreview: Component<ZipPreviewProps> = props => {
  const [tree, setTree] = createSignal<TreeNode[]>([])
  const [error, setError] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)
  const [previewFile, setPreviewFile] = createSignal<FilePreviewData | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = createSignal(false)
  const [previewError, setPreviewError] = createSignal<string | null>(null)

  const toggleNode = (path: string) => {
    const updateTree = (nodes: TreeNode[]): TreeNode[] => {
      return nodes.map(node => {
        if (node.path === path) {
          return { ...node, isOpen: !node.isOpen }
        }
        if (path.startsWith(node.path + '/') && node.children.length > 0) {
          return { ...node, children: updateTree(node.children) }
        }
        return node
      })
    }
    setTree(updateTree(tree()))
  }

  const handlePreview = async (node: TreeNode) => {
    if (!node.data) return
    
    setIsPreviewLoading(true)
    setPreviewError(null)
    
    try {
      const blob = new Blob([node.data])
      const fileType = getFileType(node.name)
      
      setPreviewFile({
        name: node.name,
        path: node.path,
        blob,
        type: fileType
      })
    } catch (err) {
      console.error('Error creating blob from zip data:', err)
      setPreviewError('Failed to preview file from zip archive')
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const closePreview = () => {
    setPreviewFile(null)
    setPreviewError(null)
  }

  onMount(async () => {
    if (props.file.size > MAX_ZIP_SIZE) {
      setError('File is too large to preview.')
      setIsLoading(false)
      return
    }

    try {
      const arrayBuffer = await props.file.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const unzipped = unzipSync(uint8Array)
      const fileTree = processZipFiles(unzipped)
      setTree(fileTree)
    } catch (e) {
      console.error('Error reading zip file:', e)
      setError('Could not read the contents of the zip file.')
    } finally {
      setIsLoading(false)
    }
  })

  return (
    <>
      <div class='h-full overflow-auto rounded-md bg-gray-50 p-4 dark:bg-gray-700'>
        <Show when={isLoading()}>
          <div class='flex h-full items-center justify-center'>
            <div class='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-blue-600 motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-blue-500'></div>
          </div>
        </Show>

        <Show when={error()}>
          <div class='p-8 text-center'>
            <p class='mb-2 text-red-500'>{error()}</p>
            <p class='text-sm text-gray-500 dark:text-gray-400'>Try downloading the file instead.</p>
          </div>
        </Show>

        <Show when={!isLoading() && !error()}>
          <div class='mb-4 text-xs text-gray-500 dark:text-gray-400'>
            Click on files to preview their contents
          </div>
          <ul class='space-y-1'>
            <For each={tree()}>{node => <Node node={node} onToggle={toggleNode} onPreview={handlePreview} />}</For>
          </ul>
        </Show>
      </div>

      {/* File Preview Modal */}
      <Show when={previewFile() || isPreviewLoading() || previewError()}>
        <div class='fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-gray-900/75 p-4 backdrop-blur-sm dark:bg-gray-900/80'>
          <div class='relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-md bg-white dark:bg-gray-800'>
            <div class='flex items-center justify-between rounded-t-md border-b border-gray-200 p-3 sm:p-4 dark:border-gray-600'>
              <h3 class='truncate text-xl font-semibold text-gray-900 dark:text-white'>
                {previewFile()?.name || 'Loading...'}
              </h3>
              <button
                onClick={closePreview}
                type='button'
                class='ml-auto inline-flex items-center rounded-md bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-600 dark:hover:text-white'
              >
                <svg class='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path stroke-linecap='round' stroke-linejoin='round' stroke-width={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
                <span class='sr-only'>Close</span>
              </button>
            </div>

            <div class='flex flex-1 items-center justify-center overflow-auto p-4 sm:p-6'>
              <Show when={isPreviewLoading()}>
                <div class='flex h-full items-center justify-center'>
                  <div class='inline-block h-12 w-12 animate-spin rounded-lg border-4 border-solid border-current border-e-transparent align-[-0.125em] text-blue-600 motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-blue-500'></div>
                </div>
              </Show>

              <Show when={previewError()}>
                <div class='p-8 text-center'>
                  <p class='mb-2 text-red-500'>{previewError()}</p>
                  <p class='text-sm text-gray-500 dark:text-gray-400'>
                    Unable to preview this file.
                  </p>
                </div>
              </Show>

              <Show when={previewFile() && !isPreviewLoading() && !previewError()}>
                <Switch
                  fallback={
                    <div class='p-8 text-center'>
                      <div class='mb-4 inline-block rounded-md bg-gray-100 p-6 dark:bg-gray-700'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          class='mx-auto h-16 w-16 text-gray-400 dark:text-gray-300'
                          fill='none'
                          viewBox='0 0 24 24'
                          stroke='currentColor'
                        >
                          <path
                            stroke-linecap='round'
                            stroke-linejoin='round'
                            stroke-width={2}
                            d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                          />
                        </svg>
                      </div>
                      <p class='mb-2 text-gray-600 dark:text-gray-300'>
                        Preview not available for this file type.
                      </p>
                      <p class='text-sm text-gray-500 dark:text-gray-400'>
                        {previewFile()?.type || 'Unknown type'}
                      </p>
                    </div>
                  }
                >
                  <Match when={previewFile()?.type.startsWith('image/')}>
                    <img
                      src={URL.createObjectURL(previewFile()!.blob)}
                      alt={previewFile()!.name}
                      class='max-h-full max-w-full object-contain'
                      onError={() => setPreviewError('Failed to load image')}
                    />
                  </Match>
                  <Match when={previewFile()?.type.startsWith('video/')}>
                    <video
                      src={URL.createObjectURL(previewFile()!.blob)}
                      controls
                      class='max-h-full max-w-full'
                      onError={() => setPreviewError('Failed to load video')}
                    />
                  </Match>
                  <Match when={previewFile()?.type.startsWith('audio/')}>
                    <audio
                      src={URL.createObjectURL(previewFile()!.blob)}
                      controls
                      class='w-full'
                      onError={() => setPreviewError('Failed to load audio')}
                    />
                  </Match>
                  <Match when={previewFile()?.type === 'application/pdf'}>
                    <iframe
                      src={URL.createObjectURL(previewFile()!.blob)}
                      class='h-full w-full'
                      style={{ 'min-height': '70vh' }}
                      onError={() => setPreviewError('Failed to load PDF')}
                    />
                  </Match>
                  <Match when={previewFile()?.type.startsWith('text/')}>
                    <div class='w-full overflow-auto'>
                      <TextPreview file={previewFile()!.blob} />
                    </div>
                  </Match>
                </Switch>
              </Show>
            </div>
          </div>
        </div>
      </Show>
    </>
  )
}

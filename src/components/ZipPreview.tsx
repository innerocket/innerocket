import { createSignal, onMount, type Component, For, Show } from 'solid-js'
import JSZip from 'jszip'
import { File, Folder, ChevronRight, ChevronDown } from 'lucide-solid'

interface ZipPreviewProps {
  file: Blob
}

interface TreeNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children: TreeNode[]
  depth: number
  isOpen?: boolean
}

const MAX_ZIP_SIZE = 100 * 1024 * 1024 // 100MB

const processZipFiles = (zipFiles: { [key: string]: JSZip.JSZipObject }): TreeNode[] => {
  const root: TreeNode = {
    name: 'root',
    type: 'folder',
    path: '',
    children: [],
    depth: -1,
  }
  const nodeMap: { [key: string]: TreeNode } = { '': root }

  const sortedFiles = Object.values(zipFiles).sort((a, b) => a.name.localeCompare(b.name))

  for (const file of sortedFiles) {
    const pathParts = file.name.replace(/\/$/, '').split('/')
    let parent = root

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      const currentPath = pathParts.slice(0, i + 1).join('/')

      let node = nodeMap[currentPath]

      if (!node) {
        const isFolder = i < pathParts.length - 1 || file.dir
        node = {
          name: part,
          type: isFolder ? 'folder' : 'file',
          path: currentPath,
          children: [],
          depth: i,
          isOpen: false,
        }
        nodeMap[currentPath] = node
        parent.children.push(node)
      }
      parent = node
    }
  }
  return root.children
}

const Node: Component<{ node: TreeNode; onToggle: (path: string) => void }> = props => {
  const getPadding = () => ({ 'padding-left': `${props.node.depth * 1.5}rem` })

  return (
    <li>
      <div
        class='flex cursor-pointer items-center rounded-md p-1 text-sm text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-600'
        style={getPadding()}
        onClick={() => props.onToggle(props.node.path)}
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
          <File class='mr-2 ml-6 h-4 w-4 text-gray-400' />
        )}
        <span>{props.node.name}</span>
      </div>
      <Show when={props.node.type === 'folder' && props.node.isOpen}>
        <ul>
          <For each={props.node.children}>
            {child => <Node node={child} onToggle={props.onToggle} />}
          </For>
        </ul>
      </Show>
    </li>
  )
}

export const ZipPreview: Component<ZipPreviewProps> = props => {
  const [tree, setTree] = createSignal<TreeNode[]>([])
  const [error, setError] = createSignal<string | null>(null)
  const [isLoading, setIsLoading] = createSignal(true)

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

  onMount(async () => {
    if (props.file.size > MAX_ZIP_SIZE) {
      setError('File is too large to preview.')
      setIsLoading(false)
      return
    }

    try {
      const zip = await JSZip.loadAsync(props.file)
      const fileTree = processZipFiles(zip.files)
      setTree(fileTree)
    } catch (e) {
      console.error('Error reading zip file:', e)
      setError('Could not read the contents of the zip file.')
    } finally {
      setIsLoading(false)
    }
  })

  return (
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
        <ul class='space-y-1'>
          <For each={tree()}>{node => <Node node={node} onToggle={toggleNode} />}</For>
        </ul>
      </Show>
    </div>
  )
}

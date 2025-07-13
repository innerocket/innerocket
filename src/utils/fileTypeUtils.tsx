import type { JSX } from 'solid-js'
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  FileSpreadsheet,
  FileType,
} from 'lucide-solid'

export interface FileTypeConfig {
  icon: () => JSX.Element
  backgroundColor: string
  textColor: string
  category: string
}

// Reusable icon components to avoid creating functions repeatedly
const ICONS = {
  document: () => <FileText />,
  spreadsheet: () => <FileSpreadsheet />,
  image: () => <Image />,
  video: () => <Video />,
  audio: () => <Music />,
  archive: () => <Archive />,
  code: () => <Code />,
  default: () => <FileType />,
} as const

// Base configurations for each category
const CATEGORY_CONFIGS = {
  document: {
    icon: ICONS.document,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'document',
  },
  documentPdf: {
    icon: ICONS.document,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'document',
  },
  documentGray: {
    icon: ICONS.document,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'document',
  },
  spreadsheet: {
    icon: ICONS.spreadsheet,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'spreadsheet',
  },
  image: {
    icon: ICONS.image,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'image',
  },
  video: {
    icon: ICONS.video,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'video',
  },
  audio: {
    icon: ICONS.audio,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'audio',
  },
  archive: {
    icon: ICONS.archive,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'archive',
  },
  codeYellow: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeBlue: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeCyan: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeOrange: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeGreen: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeRed: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeSlate: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  codeGray: {
    icon: ICONS.code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
} as const

// File extension mappings - grouped by category for better organization
const FILE_EXTENSIONS = {
  // Documents
  pdf: 'documentPdf',
  doc: 'document',
  docx: 'document',
  txt: 'documentGray',
  rtf: 'documentGray',

  // Spreadsheets
  xls: 'spreadsheet',
  xlsx: 'spreadsheet',
  csv: 'spreadsheet',

  // Images
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',

  // Videos
  mp4: 'video',
  avi: 'video',
  mov: 'video',
  mkv: 'video',
  webm: 'video',

  // Audio
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  aac: 'audio',
  ogg: 'audio',

  // Archives
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
  tar: 'archive',
  gz: 'archive',

  // Code
  js: 'codeYellow',
  ts: 'codeBlue',
  tsx: 'codeBlue',
  jsx: 'codeCyan',
  html: 'codeOrange',
  css: 'codeBlue',
  py: 'codeGreen',
  java: 'codeRed',
  cpp: 'codeSlate',
  c: 'codeSlate',
  json: 'codeGray',
  xml: 'codeOrange',
  md: 'codeGray',
} as const

// Generate the final configurations
export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = Object.fromEntries(
  Object.entries(FILE_EXTENSIONS).map(([ext, configKey]) => [
    ext,
    CATEGORY_CONFIGS[configKey as keyof typeof CATEGORY_CONFIGS],
  ])
)

// Default config for unknown file types
const DEFAULT_CONFIG: FileTypeConfig = {
  icon: ICONS.default,
  backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
  textColor: 'text-blue-600 dark:text-blue-400',
  category: 'unknown',
}

export function getFileTypeConfig(fileName: string): FileTypeConfig {
  const extension = fileName.split('.').pop()?.toLowerCase()

  if (!extension) {
    return DEFAULT_CONFIG
  }

  return FILE_TYPE_CONFIGS[extension] || DEFAULT_CONFIG
}

export function getFileExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  return extension || ''
}

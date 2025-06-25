import type { ElementType } from 'react'
import {
  FileText,
  Image,
  Video,
  Music,
  Archive,
  Code,
  FileSpreadsheet,
  FileType,
} from 'lucide-preact'

export interface FileTypeConfig {
  icon: ElementType
  backgroundColor: string
  textColor: string
  category: string
}

export const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  // Documents
  pdf: {
    icon: FileText,
    backgroundColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-600 dark:text-red-400',
    category: 'document',
  },
  doc: {
    icon: FileText,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'document',
  },
  docx: {
    icon: FileText,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'document',
  },
  txt: {
    icon: FileText,
    backgroundColor: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    category: 'document',
  },
  rtf: {
    icon: FileText,
    backgroundColor: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    category: 'document',
  },

  // Spreadsheets
  xls: {
    icon: FileSpreadsheet,
    backgroundColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-600 dark:text-green-400',
    category: 'spreadsheet',
  },
  xlsx: {
    icon: FileSpreadsheet,
    backgroundColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-600 dark:text-green-400',
    category: 'spreadsheet',
  },
  csv: {
    icon: FileSpreadsheet,
    backgroundColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-600 dark:text-green-400',
    category: 'spreadsheet',
  },

  // Images
  jpg: {
    icon: Image,
    backgroundColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    category: 'image',
  },
  jpeg: {
    icon: Image,
    backgroundColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    category: 'image',
  },
  png: {
    icon: Image,
    backgroundColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    category: 'image',
  },
  gif: {
    icon: Image,
    backgroundColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    category: 'image',
  },
  svg: {
    icon: Image,
    backgroundColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    category: 'image',
  },
  webp: {
    icon: Image,
    backgroundColor: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    category: 'image',
  },

  // Videos
  mp4: {
    icon: Video,
    backgroundColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    category: 'video',
  },
  avi: {
    icon: Video,
    backgroundColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    category: 'video',
  },
  mov: {
    icon: Video,
    backgroundColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    category: 'video',
  },
  mkv: {
    icon: Video,
    backgroundColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    category: 'video',
  },
  webm: {
    icon: Video,
    backgroundColor: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    category: 'video',
  },

  // Audio
  mp3: {
    icon: Music,
    backgroundColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'audio',
  },
  wav: {
    icon: Music,
    backgroundColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'audio',
  },
  flac: {
    icon: Music,
    backgroundColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'audio',
  },
  aac: {
    icon: Music,
    backgroundColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'audio',
  },
  ogg: {
    icon: Music,
    backgroundColor: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    category: 'audio',
  },

  // Archives
  zip: {
    icon: Archive,
    backgroundColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    category: 'archive',
  },
  rar: {
    icon: Archive,
    backgroundColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    category: 'archive',
  },
  '7z': {
    icon: Archive,
    backgroundColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    category: 'archive',
  },
  tar: {
    icon: Archive,
    backgroundColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    category: 'archive',
  },
  gz: {
    icon: Archive,
    backgroundColor: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    category: 'archive',
  },

  // Code
  js: {
    icon: Code,
    backgroundColor: 'bg-yellow-100 dark:bg-yellow-900/20',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    category: 'code',
  },
  ts: {
    icon: Code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  tsx: {
    icon: Code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  jsx: {
    icon: Code,
    backgroundColor: 'bg-cyan-100 dark:bg-cyan-900/20',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    category: 'code',
  },
  html: {
    icon: Code,
    backgroundColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    category: 'code',
  },
  css: {
    icon: Code,
    backgroundColor: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    category: 'code',
  },
  py: {
    icon: Code,
    backgroundColor: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-600 dark:text-green-400',
    category: 'code',
  },
  java: {
    icon: Code,
    backgroundColor: 'bg-red-100 dark:bg-red-900/20',
    textColor: 'text-red-600 dark:text-red-400',
    category: 'code',
  },
  cpp: {
    icon: Code,
    backgroundColor: 'bg-slate-100 dark:bg-slate-900/20',
    textColor: 'text-slate-600 dark:text-slate-400',
    category: 'code',
  },
  c: {
    icon: Code,
    backgroundColor: 'bg-slate-100 dark:bg-slate-900/20',
    textColor: 'text-slate-600 dark:text-slate-400',
    category: 'code',
  },
  json: {
    icon: Code,
    backgroundColor: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    category: 'code',
  },
  xml: {
    icon: Code,
    backgroundColor: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-600 dark:text-orange-400',
    category: 'code',
  },
  md: {
    icon: Code,
    backgroundColor: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-600 dark:text-gray-400',
    category: 'code',
  },
}

// Default config for unknown file types
const DEFAULT_CONFIG: FileTypeConfig = {
  icon: FileType,
  backgroundColor: 'bg-gray-100 dark:bg-gray-900/20',
  textColor: 'text-gray-600 dark:text-gray-400',
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

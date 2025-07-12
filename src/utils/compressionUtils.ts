import { deflate, inflate, deflateSync, inflateSync } from 'fflate'

export interface CompressionResult {
  compressedData: Uint8Array
  originalSize: number
  compressedSize: number
  compressionRatio: number
  isCompressed: boolean
}

export interface CompressionOptions {
  level?: number // 0-9, default 6
  enableCompression?: boolean
  minSizeThreshold?: number // minimum file size to consider compression (bytes)
  maxCompressionRatio?: number // skip compression if ratio would be worse than this
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  level: 6,
  enableCompression: true,
  minSizeThreshold: 1024, // 1KB
  maxCompressionRatio: 0.95, // skip if compression saves less than 5%
}

const COMPRESSIBLE_MIME_TYPES = new Set([
  'text/plain',
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/svg+xml',
  'application/x-httpd-php',
  'application/x-sh',
])

const INCOMPRESSIBLE_EXTENSIONS = new Set([
  '.zip',
  '.rar',
  '.7z',
  '.gz',
  '.bz2',
  '.tar',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.webm',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
])

export function shouldCompress(
  filename: string,
  mimeType: string,
  fileSize: number,
  options: CompressionOptions = {}
): boolean {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (!opts.enableCompression || fileSize < opts.minSizeThreshold) {
    return false
  }

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'))
  if (INCOMPRESSIBLE_EXTENSIONS.has(extension)) {
    return false
  }

  if (COMPRESSIBLE_MIME_TYPES.has(mimeType.toLowerCase())) {
    return true
  }

  if (mimeType.startsWith('text/')) {
    return true
  }

  return false
}

export function getOptimalCompressionLevel(
  connectionQuality: 'fast' | 'medium' | 'slow'
): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 {
  switch (connectionQuality) {
    case 'fast':
      return 9 // Maximum compression for fast connections
    case 'medium':
      return 6 // Balanced compression
    case 'slow':
      return 3 // Fast compression for slow connections
    default:
      return 6
  }
}

export async function compressData(
  data: Uint8Array,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = data.length

  if (!opts.enableCompression || originalSize < opts.minSizeThreshold) {
    return {
      compressedData: data,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      isCompressed: false,
    }
  }

  return new Promise((resolve, reject) => {
    deflate(
      data,
      { level: opts.level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 },
      (err, compressed) => {
        if (err) {
          reject(err)
          return
        }

        const compressedSize = compressed.length
        const compressionRatio = compressedSize / originalSize

        if (compressionRatio >= opts.maxCompressionRatio) {
          resolve({
            compressedData: data,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1.0,
            isCompressed: false,
          })
        } else {
          resolve({
            compressedData: compressed,
            originalSize,
            compressedSize,
            compressionRatio,
            isCompressed: true,
          })
        }
      }
    )
  })
}

export function compressDataSync(
  data: Uint8Array,
  options: CompressionOptions = {}
): CompressionResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const originalSize = data.length

  if (!opts.enableCompression || originalSize < opts.minSizeThreshold) {
    return {
      compressedData: data,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      isCompressed: false,
    }
  }

  try {
    const compressed = deflateSync(data, {
      level: opts.level as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9,
    })
    const compressedSize = compressed.length
    const compressionRatio = compressedSize / originalSize

    if (compressionRatio >= opts.maxCompressionRatio) {
      return {
        compressedData: data,
        originalSize,
        compressedSize: originalSize,
        compressionRatio: 1.0,
        isCompressed: false,
      }
    }

    return {
      compressedData: compressed,
      originalSize,
      compressedSize,
      compressionRatio,
      isCompressed: true,
    }
  } catch {
    return {
      compressedData: data,
      originalSize,
      compressedSize: originalSize,
      compressionRatio: 1.0,
      isCompressed: false,
    }
  }
}

export async function decompressData(
  compressedData: Uint8Array,
  isCompressed: boolean
): Promise<Uint8Array> {
  if (!isCompressed) {
    return compressedData
  }

  return new Promise((resolve, reject) => {
    inflate(compressedData, (err, decompressed) => {
      if (err) {
        reject(err)
        return
      }
      resolve(decompressed)
    })
  })
}

export function decompressDataSync(compressedData: Uint8Array, isCompressed: boolean): Uint8Array {
  if (!isCompressed) {
    return compressedData
  }

  try {
    return inflateSync(compressedData)
  } catch (error) {
    throw new Error(`Failed to decompress data: ${error}`)
  }
}

export function calculateCompressionSavings(
  originalSize: number,
  compressedSize: number
): { savedBytes: number; savedPercentage: number } {
  const savedBytes = originalSize - compressedSize
  const savedPercentage = (savedBytes / originalSize) * 100

  return {
    savedBytes,
    savedPercentage: Math.round(savedPercentage * 100) / 100,
  }
}

export function formatCompressionStats(result: CompressionResult): string {
  if (!result.isCompressed) {
    return 'No compression applied'
  }

  const savings = calculateCompressionSavings(result.originalSize, result.compressedSize)
  return `Compressed: ${formatBytes(result.originalSize)} → ${formatBytes(result.compressedSize)} (${savings.savedPercentage}% saved)`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

import { logger } from './logger'

export const createFileDownload = (blob: Blob, fileName: string): void => {
  // Special handling for .mov files and other video formats
  if (fileName.toLowerCase().endsWith('.mov') || blob.type.startsWith('video/')) {
    downloadVideoFile(blob, fileName)
  } else {
    downloadRegularFile(blob, fileName)
  }
}

const downloadVideoFile = (blob: Blob, fileName: string): void => {
  try {
    // Force the correct MIME type for QuickTime (.mov) files
    const mimeType = fileName.toLowerCase().endsWith('.mov')
      ? 'video/quicktime'
      : blob.type || 'video/mp4'

    // Create a new blob with proper type headers
    const newBlob = new Blob([blob], { type: mimeType })
    const url = URL.createObjectURL(newBlob)

    // Try the download attribute method first
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href = url
    a.download = fileName
    a.setAttribute('data-downloadurl', [mimeType, fileName, url].join(':'))

    document.body.appendChild(a)

    setTimeout(() => {
      a.click()

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 200)
    }, 0)
  } catch (error) {
    logger.error('Error downloading video file:', error)
    fallbackVideoDownload(blob, fileName)
  }
}

const fallbackVideoDownload = (blob: Blob, fileName: string): void => {
  try {
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')

    if (win) {
      win.document.title = 'Download ' + fileName
      const doc = win.document
      doc.body.style.margin = '0'
      doc.body.style.padding = '10px'
      doc.body.style.fontFamily = 'sans-serif'

      const p = doc.createElement('p')
      p.textContent = `Right-click on the video below and select "Save Video As..." to download ${fileName}`

      const video = doc.createElement('video')
      video.controls = true
      video.autoplay = true
      video.style.maxWidth = '100%'
      video.style.maxHeight = '80vh'

      const source = doc.createElement('source')
      source.src = url
      source.type = blob.type || 'video/mp4'

      const fallbackText = doc.createTextNode('Your browser does not support the video tag.')

      video.appendChild(source)
      video.appendChild(fallbackText)

      doc.body.appendChild(p)
      doc.body.appendChild(video)
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (secondError) {
    logger.error('Fallback download also failed:', secondError)
    alert('Download failed. Please try again or use a different browser.')
  }
}

const downloadRegularFile = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const createPreviewUrl = (blob: Blob): string => {
  return URL.createObjectURL(blob)
}

export const getFileTypeFromName = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()

  switch (ext) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
      return 'video/ogg'
    case 'mov':
      return 'video/quicktime'
    case 'avi':
      return 'video/x-msvideo'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'pdf':
      return 'application/pdf'
    case 'txt':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}

export const createProgressAnimation = (
  onUpdate: (progress: number) => void,
  maxProgress: number = 95,
  interval: number = 100
) => {
  let progress = 0

  const intervalId = setInterval(() => {
    progress += 5
    if (progress >= maxProgress) {
      progress = maxProgress
    }
    onUpdate(progress)
  }, interval)

  return () => clearInterval(intervalId)
}

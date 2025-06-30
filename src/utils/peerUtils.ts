import Sqlds from 'sqids'

const sqlds = new Sqlds()

// Service prefix for PeerJS IDs to avoid conflicts
const SERVICE_PREFIX = 'innerocket-'

// Helper functions for ID transformation
export const addServicePrefix = (id: string): string => {
  if (id.startsWith(SERVICE_PREFIX)) {
    return id
  }
  return SERVICE_PREFIX + id
}

export const removeServicePrefix = (id: string): string => {
  if (id.startsWith(SERVICE_PREFIX)) {
    return id.substring(SERVICE_PREFIX.length)
  }
  return id
}

// Function to validate if an ID is in the expected Sqids format
export const isValidSqldsId = (id: string): boolean => {
  if (!id || typeof id !== 'string') return false

  // Remove prefix for validation if present
  const cleanId = removeServicePrefix(id)

  // Check if it's a UUID format (with dashes) - these should be regenerated
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (uuidPattern.test(cleanId)) {
    if (import.meta.env.DEV) {
      console.log('Detected UUID format ID, will regenerate')
    }
    return false
  }

  // Check if it's a NanoID format (typically 21 characters, URL-safe)
  // NanoIDs contain A-Za-z0-9_- and are usually 21 characters
  if (cleanId.length === 21 && /^[A-Za-z0-9_-]+$/.test(cleanId)) {
    if (import.meta.env.DEV) {
      console.log('Detected NanoID format ID, will regenerate')
    }
    return false
  }

  // Check for other long IDs that might be from previous formats
  if (cleanId.length > 18) {
    if (import.meta.env.DEV) {
      console.log('Detected long ID format, will regenerate')
    }
    return false
  }

  // Sqids uses a default alphabet: abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
  // The IDs should only contain these characters
  const sqldsAlphabetPattern = /^[a-zA-Z0-9]+$/

  // Accept IDs that are within a reasonable length range and use the Sqids alphabet
  const isValidLength = cleanId.length >= 1 && cleanId.length <= 18
  const hasValidCharacters = sqldsAlphabetPattern.test(cleanId)

  const isValid = isValidLength && hasValidCharacters

  if (!isValid && process.env.NODE_ENV === 'development') {
    console.log('ID validation failed:', {
      id: cleanId,
      length: cleanId.length,
      validLength: isValidLength,
      validCharacters: hasValidCharacters,
    })
  }

  return isValid
}

// Function to generate a new Sqlds ID
export const generateSqldsId = (): string => {
  return sqlds.encode([Date.now(), Math.floor(Math.random() * 10000)])
}

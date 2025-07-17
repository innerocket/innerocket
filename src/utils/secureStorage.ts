/**
 * Secure storage utility for encrypting sensitive data before storing in localStorage
 */

// Simple XOR-based encryption for basic obfuscation
// Note: This is not cryptographically secure but provides basic protection against casual inspection
function encryptData(data: string, key: string): string {
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(result) // Base64 encode
}

function decryptData(encryptedData: string, key: string): string {
  try {
    const data = atob(encryptedData) // Base64 decode
    let result = ''
    for (let i = 0; i < data.length; i++) {
      result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
    }
    return result
  } catch {
    throw new Error('Failed to decrypt data')
  }
}

// Generate a simple key based on user agent and screen properties
function generateEncryptionKey(): string {
  const userAgent = navigator.userAgent || 'default'
  const screen = `${window.screen.width}x${window.screen.height}`
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  return btoa(`${userAgent}-${screen}-${timezone}`).slice(0, 32)
}

export class SecureStorage {
  private static encryptionKey = generateEncryptionKey()

  static setItem(key: string, value: any): void {
    try {
      const jsonData = JSON.stringify(value)
      const encryptedData = encryptData(jsonData, this.encryptionKey)
      localStorage.setItem(key, encryptedData)
    } catch {
      // Fallback to regular storage if encryption fails
      localStorage.setItem(key, JSON.stringify(value))
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      if (item === null) return null

      try {
        // Try to decrypt first
        const decryptedData = decryptData(item, this.encryptionKey)
        return JSON.parse(decryptedData)
      } catch {
        // If decryption fails, try parsing as plain JSON (for backward compatibility)
        return JSON.parse(item)
      }
    } catch {
      return null
    }
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key)
  }

  static clear(): void {
    localStorage.clear()
  }
}
/**
 * Secure storage utility for encrypting sensitive data before storing in localStorage
 */

import { logger } from './logger'

const STORAGE_VERSION_PREFIX = 'v1:'
const AES_GCM_IV_LENGTH = 12

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function getCrypto(): Crypto | null {
  if (typeof globalThis === 'undefined' || !('crypto' in globalThis)) {
    return null
  }

  const cryptoObject = globalThis.crypto as Crypto | undefined
  return cryptoObject?.subtle ? cryptoObject : null
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null
    }
    return globalThis.localStorage
  } catch {
    return null
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function legacyDecryptData(encryptedData: string, key: string): string {
  const data = atob(encryptedData)
  let result = ''
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return result
}

function generateEncryptionKey(): string {
  const userAgent =
    typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'default'
  const screen =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : '0x0'
  const timezone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC'

  return btoa(`${userAgent}-${screen}-${timezone}`).slice(0, 32)
}

export class SecureStorage {
  private static encryptionKeyPromise: Promise<CryptoKey | null> | null = null
  private static legacyKey: string | null = null

  private static getLegacyKey(): string {
    if (!this.legacyKey) {
      this.legacyKey = generateEncryptionKey()
    }
    return this.legacyKey
  }

  private static async getEncryptionKey(): Promise<CryptoKey | null> {
    if (!this.encryptionKeyPromise) {
      this.encryptionKeyPromise = this.deriveEncryptionKey()
    }
    return this.encryptionKeyPromise
  }

  private static async deriveEncryptionKey(): Promise<CryptoKey | null> {
    const cryptoObject = getCrypto()
    const subtle = cryptoObject?.subtle
    if (!subtle) {
      logger.warn('SecureStorage: Web Crypto API is not available; falling back to plain storage')
      return null
    }

    try {
      const keyMaterial = textEncoder.encode(this.getLegacyKey())
      const digest = await subtle.digest('SHA-256', keyMaterial)
      return await subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
      ])
    } catch (error) {
      logger.error('SecureStorage: Failed to derive encryption key', error)
      return null
    }
  }

  static async setItem(key: string, value: unknown): Promise<void> {
    const storage = getLocalStorage()
    if (!storage) {
      logger.warn('SecureStorage: localStorage is not available; skipping set for key:', key)
      return
    }

    try {
      const jsonData = JSON.stringify(value)
      const cryptoObject = getCrypto()
      const subtle = cryptoObject?.subtle

      if (!subtle) {
        storage.setItem(key, jsonData)
        return
      }

      const encryptionKey = await this.getEncryptionKey()
      if (!encryptionKey) {
        storage.setItem(key, jsonData)
        return
      }

      const dataBuffer = textEncoder.encode(jsonData)
      const iv = cryptoObject.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH))
      const encryptedBuffer = await subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        dataBuffer
      )

      const payload = new Uint8Array(iv.length + encryptedBuffer.byteLength)
      payload.set(iv)
      payload.set(new Uint8Array(encryptedBuffer), iv.length)

      const base64Payload = arrayBufferToBase64(payload.buffer)
      storage.setItem(key, `${STORAGE_VERSION_PREFIX}${base64Payload}`)
    } catch (error) {
      logger.error('SecureStorage: Failed to encrypt and store data for key:', key, error)
      throw new Error('Failed to securely store sensitive data')
    }
  }

  static async getItem<T>(key: string): Promise<T | null> {
    const storage = getLocalStorage()
    if (!storage) {
      return null
    }

    try {
      const item = storage.getItem(key)
      if (item === null) return null

      if (item.startsWith(STORAGE_VERSION_PREFIX)) {
        const cryptoObject = getCrypto()
        const subtle = cryptoObject?.subtle

        if (subtle) {
          try {
            const encryptionKey = await this.getEncryptionKey()
            if (encryptionKey) {
              const payload = base64ToUint8Array(item.slice(STORAGE_VERSION_PREFIX.length))
              const iv = payload.slice(0, AES_GCM_IV_LENGTH)
              const ciphertext = payload.slice(AES_GCM_IV_LENGTH)
              const decryptedBuffer = await subtle.decrypt(
                { name: 'AES-GCM', iv },
                encryptionKey,
                ciphertext
              )
              const decryptedData = textDecoder.decode(decryptedBuffer)
              return JSON.parse(decryptedData) as T
            }
          } catch (error) {
            logger.warn('SecureStorage: Failed to decrypt AES-GCM payload for key:', key, error)
          }
        }
      }

      try {
        const legacyDecrypted = legacyDecryptData(item, this.getLegacyKey())
        const parsedLegacy = JSON.parse(legacyDecrypted) as T
        void this.setItem(key, parsedLegacy).catch(error => {
          logger.warn('SecureStorage: Failed to re-encrypt legacy data for key:', key, error)
        })
        return parsedLegacy
      } catch {
        // Ignore legacy decryption failures and fall back to plain JSON parse
      }

      return JSON.parse(item) as T
    } catch (error) {
      logger.warn('SecureStorage: Failed to retrieve data for key:', key, error)
      return null
    }
  }

  static removeItem(key: string): void {
    const storage = getLocalStorage()
    storage?.removeItem(key)
  }

  static clear(): void {
    const storage = getLocalStorage()
    storage?.clear()
  }
}

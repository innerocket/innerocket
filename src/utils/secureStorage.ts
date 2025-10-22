/**
 * Secure storage utility for encrypting sensitive data before storing in localStorage
 */

import { logger } from './logger'

const STORAGE_VERSION_PREFIX = 'v2:'
const LEGACY_STORAGE_PREFIX = 'v1:'
const MIGRATION_FAILURE_MARKER_PREFIX = 'innerocket_securestorage_migration_failed:'
const AES_GCM_IV_LENGTH = 12

// PBKDF2 configuration keeps parameters visible for audits and tuning.
const PBKDF2_ITERATIONS = 310_000
const PBKDF2_SALT_LENGTH_BYTES = 16
const KEY_MATERIAL_LENGTH_BYTES = 32
const KEY_METADATA_STORAGE_KEY = 'innerocket_securestorage_key_metadata_v1'

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

type KeyDerivationMetadata = {
  version: 1
  iterations: number
  keyMaterial: string
  salt: string
}

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

function uint8ArrayToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
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
  private static keyMetadataPromise: Promise<KeyDerivationMetadata | null> | null = null
  private static legacyKey: string | null = null
  private static legacyEncryptionKeyPromise: Promise<CryptoKey | null> | null = null

  static isLatestVersion(value: string | null): boolean {
    return typeof value === 'string' && value.startsWith(STORAGE_VERSION_PREFIX)
  }

  static hasMigrationFailure(key: string): boolean {
    const storage = getLocalStorage()
    if (!storage) {
      return false
    }
    return storage.getItem(this.getMigrationFailureMarkerKey(key)) !== null
  }

  private static async getKeyMetadata(): Promise<KeyDerivationMetadata | null> {
    if (!this.keyMetadataPromise) {
      this.keyMetadataPromise = this.loadOrCreateKeyMetadata()
    }
    return this.keyMetadataPromise
  }

  private static async loadOrCreateKeyMetadata(): Promise<KeyDerivationMetadata | null> {
    const cryptoObject = getCrypto()
    const subtle = cryptoObject?.subtle

    if (!cryptoObject || !subtle) {
      logger.warn('SecureStorage: Web Crypto API is not available; using legacy key derivation')
      return null
    }

    const storage = getLocalStorage()

    if (storage) {
      const stored = storage.getItem(KEY_METADATA_STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<KeyDerivationMetadata>
          if (this.isValidMetadata(parsed)) {
            return parsed
          }
          logger.warn('SecureStorage: Invalid stored key metadata shape, regenerating metadata')
        } catch (error) {
          logger.warn(
            'SecureStorage: Failed to parse stored key metadata, regenerating metadata',
            error
          )
        }
      }
    }

    try {
      const keyMaterial = cryptoObject.getRandomValues(new Uint8Array(KEY_MATERIAL_LENGTH_BYTES))
      const salt = cryptoObject.getRandomValues(new Uint8Array(PBKDF2_SALT_LENGTH_BYTES))

      const metadata: KeyDerivationMetadata = {
        version: 1,
        iterations: PBKDF2_ITERATIONS,
        keyMaterial: arrayBufferToBase64(keyMaterial.buffer),
        salt: arrayBufferToBase64(salt.buffer),
      }

      if (storage) {
        try {
          storage.setItem(KEY_METADATA_STORAGE_KEY, JSON.stringify(metadata))
        } catch (error) {
          logger.warn(
            'SecureStorage: Failed to persist key metadata; continuing with in-memory copy',
            error
          )
        }
      }

      return metadata
    } catch (error) {
      logger.error('SecureStorage: Failed to generate key metadata', error)
      return null
    }
  }

  private static isValidMetadata(
    value: Partial<KeyDerivationMetadata> | undefined
  ): value is KeyDerivationMetadata {
    if (!value) {
      return false
    }

    return (
      value.version === 1 &&
      typeof value.iterations === 'number' &&
      value.iterations > 0 &&
      typeof value.keyMaterial === 'string' &&
      value.keyMaterial.length > 0 &&
      typeof value.salt === 'string' &&
      value.salt.length > 0
    )
  }

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

  private static async getLegacyEncryptionKey(): Promise<CryptoKey | null> {
    if (!this.legacyEncryptionKeyPromise) {
      this.legacyEncryptionKeyPromise = this.deriveLegacyEncryptionKey()
    }
    return this.legacyEncryptionKeyPromise
  }

  private static getMigrationFailureMarkerKey(key: string): string {
    return `${MIGRATION_FAILURE_MARKER_PREFIX}${key}`
  }

  private static markMigrationFailure(key: string): void {
    const storage = getLocalStorage()
    if (!storage) {
      return
    }

    try {
      storage.setItem(this.getMigrationFailureMarkerKey(key), Date.now().toString())
    } catch {
      // If marker persistence fails we still return data to avoid breaking functionality.
    }
  }

  private static clearMigrationFailureMarker(key: string): void {
    const storage = getLocalStorage()
    storage?.removeItem(this.getMigrationFailureMarkerKey(key))
  }

  private static applyPlaintextFallback(value: unknown, key: string): void {
    const storage = getLocalStorage()
    if (!storage) {
      return
    }

    try {
      const serialized = JSON.stringify(value)
      storage.setItem(key, serialized ?? 'null')
    } catch (error) {
      logger.error('SecureStorage: Failed to apply plaintext fallback for key:', key, error)
    }
  }

  private static async reencryptOrFallback<T>(
    key: string,
    value: T,
    context: 'legacy' | 'v1'
  ): Promise<void> {
    try {
      await this.setItem(key, value)
    } catch (error) {
      const label = context === 'v1' ? 'v1 data' : 'legacy data'
      logger.warn(`SecureStorage: Failed to re-encrypt ${label} for key:`, key, error)
      this.markMigrationFailure(key)
      this.applyPlaintextFallback(value, key)
    }
  }

  private static async deriveEncryptionKey(): Promise<CryptoKey | null> {
    const cryptoObject = getCrypto()
    const subtle = cryptoObject?.subtle
    if (!subtle) {
      logger.warn('SecureStorage: Web Crypto API is not available; falling back to plain storage')
      return null
    }

    try {
      const metadata = await this.getKeyMetadata()
      if (!metadata) {
        return await this.deriveLegacyEncryptionKey()
      }

      const keyMaterialBytes = base64ToUint8Array(metadata.keyMaterial)
      const saltBytes = base64ToUint8Array(metadata.salt)

      const importedKey = await subtle.importKey(
        'raw',
        uint8ArrayToArrayBuffer(keyMaterialBytes),
        'PBKDF2',
        false,
        ['deriveKey']
      )

      return await subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: uint8ArrayToArrayBuffer(saltBytes),
          iterations: metadata.iterations,
          hash: 'SHA-256',
        },
        importedKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      )
    } catch (error) {
      logger.error('SecureStorage: Failed to derive encryption key', error)
      return null
    }
  }

  private static async deriveLegacyEncryptionKey(): Promise<CryptoKey | null> {
    const cryptoObject = getCrypto()
    const subtle = cryptoObject?.subtle
    if (!subtle) {
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
      logger.error('SecureStorage: Failed to derive legacy AES-GCM key', error)
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
        this.clearMigrationFailureMarker(key)
        return
      }

      const encryptionKey = await this.getEncryptionKey()
      if (!encryptionKey) {
        storage.setItem(key, jsonData)
        this.clearMigrationFailureMarker(key)
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
      this.clearMigrationFailureMarker(key)
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

      if (item.startsWith(LEGACY_STORAGE_PREFIX)) {
        const cryptoObject = getCrypto()
        const subtle = cryptoObject?.subtle

        if (subtle) {
          try {
            const legacyEncryptionKey = await this.getLegacyEncryptionKey()
            if (legacyEncryptionKey) {
              const payload = base64ToUint8Array(item.slice(LEGACY_STORAGE_PREFIX.length))
              const iv = payload.slice(0, AES_GCM_IV_LENGTH)
              const ciphertext = payload.slice(AES_GCM_IV_LENGTH)
              const decryptedBuffer = await subtle.decrypt(
                { name: 'AES-GCM', iv },
                legacyEncryptionKey,
                ciphertext
              )
              const decryptedData = textDecoder.decode(decryptedBuffer)
              const parsedLegacy = JSON.parse(decryptedData) as T
              await this.reencryptOrFallback(key, parsedLegacy, 'v1')
              return parsedLegacy
            }
          } catch (error) {
            logger.warn(
              'SecureStorage: Failed to decrypt legacy AES-GCM payload for key:',
              key,
              error
            )
          }
        }
      }

      try {
        const legacyDecrypted = legacyDecryptData(item, this.getLegacyKey())
        const parsedLegacy = JSON.parse(legacyDecrypted) as T
        await this.reencryptOrFallback(key, parsedLegacy, 'legacy')
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

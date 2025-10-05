/**
 * @vitest-environment node
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest'
import { webcrypto } from 'crypto'

import { migrateSecureStorageData } from './secureStorageMigration'
import { SECURE_STORAGE_KEYS } from '../constants/secureStorageKeys'
import { SecureStorage } from '../utils/secureStorage'

class LocalStorageMock implements Storage {
  #store = new Map<string, string>()

  clear(): void {
    this.#store.clear()
  }

  getItem(key: string): string | null {
    return this.#store.has(key) ? this.#store.get(key)! : null
  }

  key(index: number): string | null {
    const keys = Array.from(this.#store.keys())
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    this.#store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.#store.set(key, value)
  }

  get length(): number {
    return this.#store.size
  }
}

const ensureBase64Helpers = () => {
  if (typeof globalThis.atob !== 'function') {
    vi.stubGlobal('atob', (value: string) => Buffer.from(value, 'base64').toString('binary'))
  }

  if (typeof globalThis.btoa !== 'function') {
    vi.stubGlobal('btoa', (value: string) => Buffer.from(value, 'binary').toString('base64'))
  }
}

const setupEnvironment = () => {
  ensureBase64Helpers()
  vi.stubGlobal('crypto', webcrypto as unknown as Crypto)
  vi.stubGlobal('navigator', { userAgent: 'Vitest UA' } as Navigator)
  vi.stubGlobal('window', {
    screen: { width: 1920, height: 1080 },
  } as unknown as Window & typeof globalThis)
}

const computeLegacyKey = () => {
  const userAgent =
    typeof navigator !== 'undefined' && navigator.userAgent ? navigator.userAgent : 'default'
  const screenSize =
    typeof window !== 'undefined' && window.screen
      ? `${window.screen.width}x${window.screen.height}`
      : '0x0'
  const timezone =
    typeof Intl !== 'undefined' && Intl.DateTimeFormat
      ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      : 'UTC'

  return btoa(`${userAgent}-${screenSize}-${timezone}`).slice(0, 32)
}

const encryptWithLegacyXor = (value: unknown): string => {
  const data = JSON.stringify(value)
  const key = computeLegacyKey()
  let result = ''

  for (let index = 0; index < data.length; index += 1) {
    const encryptedChar = data.charCodeAt(index) ^ key.charCodeAt(index % key.length)
    result += String.fromCharCode(encryptedChar)
  }

  return btoa(result)
}

beforeAll(() => {
  setupEnvironment()
})

beforeEach(() => {
  vi.stubGlobal('localStorage', new LocalStorageMock())
  const internals = SecureStorage as unknown as {
    encryptionKeyPromise: Promise<CryptoKey | null> | null
    keyMetadataPromise: Promise<unknown> | null
    legacyKey: string | null
    legacyEncryptionKeyPromise: Promise<CryptoKey | null> | null
  }
  internals.encryptionKeyPromise = null
  internals.keyMetadataPromise = null
  internals.legacyKey = null
  internals.legacyEncryptionKeyPromise = null
})

afterEach(() => {
  vi.restoreAllMocks()
  setupEnvironment()
})

describe('migrateSecureStorageData', () => {
  it('upgrades legacy XOR encrypted payloads to the current AES-GCM format', async () => {
    const peers = ['peer-1', 'peer-2']
    localStorage.setItem(SECURE_STORAGE_KEYS.TRUSTED_PEERS, encryptWithLegacyXor(peers))

    const results = await migrateSecureStorageData()
    const migratedEntry = results.find(result => result.key === SECURE_STORAGE_KEYS.TRUSTED_PEERS)

    expect(migratedEntry?.status).toBe('migrated')
    expect(localStorage.getItem(SECURE_STORAGE_KEYS.TRUSTED_PEERS)?.startsWith('v2:')).toBe(true)
    expect(SecureStorage.hasMigrationFailure(SECURE_STORAGE_KEYS.TRUSTED_PEERS)).toBe(false)

    const historyEntry = results.find(
      result => result.key === SECURE_STORAGE_KEYS.CONNECTION_HISTORY
    )
    expect(historyEntry?.status).toBe('missing')
  })

  it('records fallback when re-encryption fails and preserves decrypted value', async () => {
    const peers = ['peer-legacy']
    localStorage.setItem(SECURE_STORAGE_KEYS.TRUSTED_PEERS, encryptWithLegacyXor(peers))

    const originalSetItem = SecureStorage.setItem
    const setItemSpy = vi
      .spyOn(SecureStorage, 'setItem')
      .mockImplementation(async (key: string, value: unknown) => {
        if (key === SECURE_STORAGE_KEYS.TRUSTED_PEERS) {
          throw new Error('Simulated encryption failure')
        }
        return originalSetItem.call(SecureStorage, key, value)
      })

    const results = await migrateSecureStorageData()

    setItemSpy.mockRestore()

    const fallbackEntry = results.find(result => result.key === SECURE_STORAGE_KEYS.TRUSTED_PEERS)

    expect(fallbackEntry?.status).toBe('fallback')
    expect(SecureStorage.hasMigrationFailure(SECURE_STORAGE_KEYS.TRUSTED_PEERS)).toBe(true)
    expect(localStorage.getItem(SECURE_STORAGE_KEYS.TRUSTED_PEERS)).toBe(JSON.stringify(peers))
  })

  it('detects already migrated payloads and skips re-encryption', async () => {
    const peers = ['peer-current']
    await SecureStorage.setItem(SECURE_STORAGE_KEYS.TRUSTED_PEERS, peers)

    const results = await migrateSecureStorageData()
    const entry = results.find(result => result.key === SECURE_STORAGE_KEYS.TRUSTED_PEERS)

    expect(entry?.status).toBe('up_to_date')
    expect(localStorage.getItem(SECURE_STORAGE_KEYS.TRUSTED_PEERS)?.startsWith('v2:')).toBe(true)
  })
})

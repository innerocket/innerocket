import { SECURE_STORAGE_KEY_VALUES, type SecureStorageKey } from '../constants/secureStorageKeys'
import { SecureStorage } from '../utils/secureStorage'
import { logger } from '../utils/logger'

export type SecureStorageMigrationStatus =
  | 'missing'
  | 'up_to_date'
  | 'migrated'
  | 'fallback'
  | 'unsupported'
  | 'no_data'

export interface SecureStorageMigrationResult {
  key: SecureStorageKey
  status: SecureStorageMigrationStatus
  detail?: string
}

const getLocalStorage = (): Storage | null => {
  try {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null
    }
    return globalThis.localStorage
  } catch {
    return null
  }
}

const hasWebCryptoSupport = (): boolean => {
  if (typeof globalThis === 'undefined' || !('crypto' in globalThis)) {
    return false
  }
  const cryptoObject = globalThis.crypto as Crypto
  return Boolean(cryptoObject?.subtle)
}

export async function migrateSecureStorageData(
  keys: SecureStorageKey[] = SECURE_STORAGE_KEY_VALUES
): Promise<SecureStorageMigrationResult[]> {
  const storage = getLocalStorage()
  if (!storage) {
    logger.warn('SecureStorageMigration: localStorage is unavailable; skipping migration')
    return keys.map(key => ({ key, status: 'unsupported', detail: 'localStorage unavailable' }))
  }

  const cryptoSupported = hasWebCryptoSupport()
  const results: SecureStorageMigrationResult[] = []

  for (const key of keys) {
    const existingValue = storage.getItem(key)
    if (existingValue === null) {
      results.push({ key, status: 'missing' })
      continue
    }

    if (SecureStorage.isLatestVersion(existingValue)) {
      results.push({ key, status: 'up_to_date' })
      continue
    }

    const valueBeforeMigration = existingValue
    const migratedValue = await SecureStorage.getItem<unknown>(key)
    const valueAfterMigration = storage.getItem(key)

    if (SecureStorage.isLatestVersion(valueAfterMigration)) {
      results.push({ key, status: 'migrated' })
      continue
    }

    if (SecureStorage.hasMigrationFailure(key)) {
      results.push({
        key,
        status: 'fallback',
        detail: 'Stored using plaintext fallback after encryption failure',
      })
      continue
    }

    if (!cryptoSupported) {
      results.push({
        key,
        status: 'unsupported',
        detail: 'Web Crypto API unavailable; data left in legacy format',
      })
      continue
    }

    if (valueAfterMigration === null || migratedValue === null) {
      results.push({ key, status: 'no_data' })
      continue
    }

    if (valueAfterMigration !== valueBeforeMigration) {
      results.push({
        key,
        status: 'fallback',
        detail: 'Legacy payload retained without version marker',
      })
      continue
    }

    results.push({
      key,
      status: 'fallback',
      detail: 'Legacy payload could not be re-encrypted',
    })
  }

  const migratedKeys = results
    .filter(result => result.status === 'migrated')
    .map(result => result.key)
  if (migratedKeys.length > 0) {
    logger.info('SecureStorageMigration: Migrated keys', migratedKeys)
  }

  const fallbackResults = results.filter(result => result.status === 'fallback')
  fallbackResults.forEach(result => {
    logger.warn('SecureStorageMigration: Fallback applied for key:', result.key, result.detail)
  })

  return results
}

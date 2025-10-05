export const SECURE_STORAGE_KEYS = {
  TRUSTED_PEERS: 'innerocket_trusted_peers',
  CONNECTION_HISTORY: 'innerocket_connection_history',
} as const

export type SecureStorageKey = (typeof SECURE_STORAGE_KEYS)[keyof typeof SECURE_STORAGE_KEYS]

export const SECURE_STORAGE_KEY_VALUES: SecureStorageKey[] = Object.values(SECURE_STORAGE_KEYS)

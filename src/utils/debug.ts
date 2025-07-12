// Debug utility for development-only logging and features
export const isDevelopment = import.meta.env.DEV

export function debugLog(message: string, ...args: any[]): void {
  if (isDevelopment) {
    console.log(message, ...args)
  }
}

export function debugWarn(message: string, ...args: any[]): void {
  if (isDevelopment) {
    console.warn(message, ...args)
  }
}

export function debugError(message: string, ...args: any[]): void {
  if (isDevelopment) {
    console.error(message, ...args)
  }
}
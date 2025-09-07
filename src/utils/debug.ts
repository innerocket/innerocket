// Debug utility for development-only logging and features
export const isDevelopment = import.meta.env.DEV

// ANSI color codes for background colors
const colors = {
  reset: '\x1b[0m',
  white: '\x1b[37m',
  black: '\x1b[30m',
  // Background colors
  bgCyan: '\x1b[46m',
  bgYellow: '\x1b[43m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
}

export function debugLog(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    console.log(`${colors.bgCyan}${colors.black} INFO ${colors.reset} ${message}`, ...args)
  }
}

export function debugWarn(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    console.warn(`${colors.bgYellow}${colors.black} WARN ${colors.reset} ${message}`, ...args)
  }
}

export function debugError(message: string, ...args: unknown[]): void {
  if (isDevelopment) {
    console.error(`${colors.bgRed}${colors.white} ERROR ${colors.reset} ${message}`, ...args)
  }
}

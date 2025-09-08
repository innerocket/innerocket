// Unified logging utility for the application
export const isDevelopment = import.meta.env.DEV

// CSS-style color codes for console output
const colors = {
  // Foreground colors (CSS hex values converted to ANSI)
  reset: '\x1b[0m',
  text: '\x1b[38;2;194;201;211m', // #c2c9d3
  white: '\x1b[38;2;255;255;255m', // #ffffff
  black: '\x1b[38;2;0;0;0m', // #000000

  // Background colors (CSS hex values converted to ANSI)
  bgCyan: '\x1b[48;2;58;181;203m', // #3eb5cb
  bgYellow: '\x1b[48;2;255;215;0m', // #ffd700
  bgRed: '\x1b[48;2;237;78;77m', // #ed4e4d
  bgBlue: '\x1b[48;2;58;115;240m', // #3a73f0
  bgMagenta: '\x1b[48;2;194;105;201m', // #c269c9
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel = 'debug'

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only allow warn and error logs
    if (!isDevelopment) {
      return level === 'warn' || level === 'error'
    }

    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.logLevel)
  }

  // Public method to check if debug logging is enabled
  isDebugEnabled(): boolean {
    return this.shouldLog('debug')
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.log(`${colors.bgMagenta}${colors.white} DEBUG ${colors.reset} ${message}`, ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.log(`${colors.bgCyan}${colors.white} INFO ${colors.reset} ${message}`, ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`${colors.bgYellow}${colors.black} WARN ${colors.reset} ${message}`, ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      const stack = new Error().stack
      const caller = stack?.split('\n')[2]?.trim() || 'unknown'
      console.error(
        `${colors.bgRed}${colors.white} ERROR ${colors.reset} ${message}`,
        caller,
        ...args
      )
    }
  }

  log(message: string, ...args: unknown[]): void {
    this.info(message, ...args)
  }

  // Specialized debug method with category for better organization
  debugWithCategory(category: string, message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      const timestamp = new Date().toTimeString().split(' ')[0]
      console.log(
        `${colors.bgMagenta}${colors.white} DEBUG ${colors.reset} [${timestamp}] [${category}] ${message}`,
        ...args
      )
    }
  }
}

// Export singleton instance
export const logger = Logger.getInstance()

// Export specialized debug functions with distinct visual formatting
export const debugLog = (message: string, ...args: unknown[]): void => {
  if (logger.isDebugEnabled()) {
    const timestamp = new Date().toTimeString().split(' ')[0]
    console.log(
      `${colors.bgBlue}${colors.white} DEBUG > INFO ${colors.reset} [${timestamp}] ${message}`,
      ...args
    )
  }
}

export const debugWarn = (message: string, ...args: unknown[]): void => {
  if (logger.isDebugEnabled()) {
    const timestamp = new Date().toTimeString().split(' ')[0]
    console.warn(
      `${colors.bgYellow}${colors.black} DEBUG > WARN ${colors.reset} [${timestamp}] ${message}`,
      ...args
    )
  }
}

export const debugError = (message: string, ...args: unknown[]): void => {
  if (logger.isDebugEnabled()) {
    const timestamp = new Date().toTimeString().split(' ')[0]
    console.error(
      `${colors.bgRed}${colors.white} DEBUG > ERROR ${colors.reset} [${timestamp}] ${message}`,
      ...args
    )
  }
}

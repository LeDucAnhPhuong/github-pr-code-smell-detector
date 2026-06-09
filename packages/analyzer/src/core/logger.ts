export interface Logger {
  debug(message: string): void
  error(message: string): void
  info(message: string): void
  warning(message: string): void
}

export class ConsoleLogger implements Logger {
  debug(message: string): void {
    if (process.env.DEBUG) {
      process.stderr.write(`[debug] ${message}\n`)
    }
  }

  error(message: string): void {
    process.stderr.write(`[error] ${message}\n`)
  }

  info(message: string): void {
    process.stderr.write(`[info] ${message}\n`)
  }

  warning(message: string): void {
    process.stderr.write(`[warn] ${message}\n`)
  }
}

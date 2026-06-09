import type { Finding } from '../core/index.js'

export interface Reporter {
  report(findings: Finding[]): string
}

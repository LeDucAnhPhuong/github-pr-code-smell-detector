export type Severity = 'error' | 'info' | 'warning'

export interface Finding {
  /** Repo-relative path, always POSIX '/' separators */
  file: string
  message: string
  /** line: 1-based, column: 0-based (ESTree loc convention) */
  range: {
    end: { column: number; line: number; }
    start: { column: number; line: number; }
  }
  ruleId: string
  severity: Severity
  suggestion?: string
}

export type DiagnosticSeverity = 'error' | 'info' | 'warning'

export interface Diagnostic {
  code: string
  file?: string
  line?: number
  message: string
  severity: DiagnosticSeverity
}

import type { Finding } from '../core/index.js'

export type AnnotationLevel = 'failure' | 'notice' | 'warning'

export interface Annotation {
  annotation_level: AnnotationLevel
  end_line: number
  message: string
  path: string
  raw_details?: string
  start_line: number
  title?: string
}

export function severityToAnnotationLevel(severity: Finding['severity']): AnnotationLevel {
  if (severity === 'error') return 'failure'
  if (severity === 'warning') return 'warning'
  return 'notice'
}

export function buildAnnotations(findings: Finding[]): Annotation[] {
  return findings.map((f) => ({
    annotation_level: severityToAnnotationLevel(f.severity),
    end_line: f.range.end.line,
    message: f.message,
    path: f.file,
    raw_details: f.suggestion,
    start_line: f.range.start.line,
    title: f.ruleId,
  }))
}

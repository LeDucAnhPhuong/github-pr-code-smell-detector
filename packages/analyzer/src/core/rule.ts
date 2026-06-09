import type { ZodType } from 'zod'

import type { Finding, Severity } from './finding.js'

export interface ReportArgs {
  message: string
  range: Finding['range']
  suggestion?: string
}

export interface RuleContext {
  readonly file: string
  readonly options: Record<string, unknown>
  report(args: ReportArgs): void
}

/** Map of ESTree node type name -> visitor function */
export type RuleListeners = Record<string, (node: unknown) => void>

export interface Rule {
  create(ctx: RuleContext): RuleListeners
  meta: {
    category: 'maintainability'
    defaultSeverity: Severity
    description: string
    docsUrl?: string
    id: string
    title: string
  }
  optionsSchema?: ZodType
}

import type { TSESTree } from '@typescript-eslint/typescript-estree'

import type { Diagnostic, Finding, Rule, RuleContext, Severity } from '../core/index.js'

import { visitAST } from './ast/visit.js'

export interface RunRuleOptions {
  ast: TSESTree.Program
  file: string
  options: Record<string, unknown>
  rule: Rule
  severityOverride?: Severity
}

export interface RunRuleResult {
  diagnostics: Diagnostic[]
  findings: Finding[]
}

export function runRule(opts: RunRuleOptions): RunRuleResult {
  const { ast, file, options, rule, severityOverride } = opts
  const findings: Finding[] = []
  const diagnostics: Diagnostic[] = []

  const ctx: RuleContext = {
    file,
    options,
    report({ message, range, suggestion }) {
      findings.push({
        file,
        message,
        range,
        ruleId: rule.meta.id,
        severity: severityOverride ?? rule.meta.defaultSeverity,
        suggestion,
      })
    },
  }

  try {
    const listeners = rule.create(ctx)
    visitAST(ast, listeners)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    diagnostics.push({
      code: 'RULE_ERROR',
      file,
      message: `Rule ${rule.meta.id} threw an unexpected error on ${file}: ${message}`,
      severity: 'error',
    })
  }

  return { diagnostics, findings }
}

/** Sort findings by (file, line, column, ruleId) — deterministic output */
export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    if (a.file !== b.file) return a.file < b.file ? -1 : 1
    if (a.range.start.line !== b.range.start.line)
      return a.range.start.line - b.range.start.line
    if (a.range.start.column !== b.range.start.column)
      return a.range.start.column - b.range.start.column
    return a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0
  })
}

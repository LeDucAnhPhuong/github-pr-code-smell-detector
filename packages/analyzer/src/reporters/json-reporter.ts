import type { Finding } from '../core/index.js'

export interface JsonOutput {
  findings: Finding[]
  summary: {
    error: number
    info: number
    total: number
    warning: number
  }
  timestamp: string
  tool: string
  version: string
}

export function buildJsonOutput(findings: Finding[], version: string): JsonOutput {
  const summary = {
    error: findings.filter((f) => f.severity === 'error').length,
    info: findings.filter((f) => f.severity === 'info').length,
    total: findings.length,
    warning: findings.filter((f) => f.severity === 'warning').length,
  }

  return {
    findings,
    summary,
    timestamp: new Date().toISOString(),
    tool: 'github-pr-code-smell-detector',
    version,
  }
}

export function renderJson(findings: Finding[], version: string): string {
  return JSON.stringify(buildJsonOutput(findings, version), null, 2)
}

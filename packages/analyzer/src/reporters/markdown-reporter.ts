import type { Finding } from '../core/index.js'

export const MARKER = '<!-- code-smell-detector -->'

export function renderMarkdown(findings: Finding[], version: string): string {
  const lines: string[] = [
    MARKER,
    '',
    `## Code Smell Detector Report`,
    '',
  ]

  if (findings.length === 0) {
    lines.push('✅ No code smell findings detected.', '', `_Analyzed by [github-pr-code-smell-detector](https://github.com/leducanhphuongdev/github-pr-code-smell-detector) v${version}_`)
    return lines.join('\n')
  }

  const summary = {
    error: findings.filter((f) => f.severity === 'error').length,
    info: findings.filter((f) => f.severity === 'info').length,
    warning: findings.filter((f) => f.severity === 'warning').length,
  }

  lines.push(`**${findings.length} finding(s):** ${summary.error} error · ${summary.warning} warning · ${summary.info} info`, '')

  // Group findings by file
  const byFile = new Map<string, Finding[]>()
  for (const f of findings) {
    const existing = byFile.get(f.file) ?? []
    existing.push(f)
    byFile.set(f.file, existing)
  }

  for (const [file, fileFindings] of byFile) {
    lines.push(`### \`${file}\``, '', '| Severity | Rule | Line | Message | Suggestion |', '|----------|------|------|---------|------------|')
    for (const f of fileFindings) {
      const sev = f.severity === 'error' ? '🔴 Error' : f.severity === 'warning' ? '🟡 Warning' : '🔵 Info'
      const {line} = f.range.start
      const msg = f.message.replaceAll('|', String.raw`\|`)
      const sug = (f.suggestion ?? '').replaceAll('|', String.raw`\|`)
      lines.push(`| ${sev} | \`${f.ruleId}\` | ${line} | ${msg} | ${sug} |`)
    }

    lines.push('')
  }

  lines.push(`_Analyzed by [github-pr-code-smell-detector](https://github.com/leducanhphuongdev/github-pr-code-smell-detector) v${version}_`)

  return lines.join('\n')
}

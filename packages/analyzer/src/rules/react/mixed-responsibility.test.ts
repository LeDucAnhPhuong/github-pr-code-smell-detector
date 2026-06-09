import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseFile } from '../../analyzer/parser.js'
import { runRule } from '../../analyzer/rule-runner.js'
import { mixedResponsibility } from './mixed-responsibility.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '__fixtures__', 'mixed-responsibility')

function runOnFixture(fixturePath: string, options: Record<string, unknown> = {}) {
  const source = readFileSync(fixturePath, 'utf-8')
  const { ast, diagnostic } = parseFile(fixturePath, source)
  if (diagnostic || !ast) throw new Error(`Parse failed: ${diagnostic?.message}`)
  return runRule({ ast, file: fixturePath, options, rule: mixedResponsibility })
}

describe('react/mixed-responsibility', () => {
  it('valid: pure UI component produces no findings', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'valid', 'pure-ui.tsx'))
    expect(findings).toHaveLength(0)
  })

  it('invalid: component with fetch + JSX produces a warning', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'mixed.tsx'))
    expect(findings.length).toBeGreaterThanOrEqual(1)
    const f = findings[0]
    expect(f.ruleId).toBe('react/mixed-responsibility')
    expect(f.severity).toBe('warning')
    expect(f.message).toContain('API calls')
    expect(f.suggestion).toContain('hook')
  })
})

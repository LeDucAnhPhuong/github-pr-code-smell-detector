import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseFile } from '../../analyzer/parser.js'
import { runRule } from '../../analyzer/rule-runner.js'
import { inlineFunctionOveruse } from './inline-function-overuse.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '__fixtures__', 'inline-function-overuse')

function runOnFixture(fixturePath: string, options: Record<string, unknown> = {}) {
  const source = readFileSync(fixturePath, 'utf-8')
  const { ast, diagnostic } = parseFile(fixturePath, source)
  if (diagnostic || !ast) throw new Error(`Parse failed: ${diagnostic?.message}`)
  return runRule({ ast, file: fixturePath, options, rule: inlineFunctionOveruse })
}

describe('react/inline-function-overuse', () => {
  it('valid: component with ≤3 inline functions produces no findings', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'valid', 'few-inline.tsx'))
    expect(findings).toHaveLength(0)
  })

  it('invalid: component with >3 inline functions produces a warning', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'many-inline.tsx'))
    expect(findings.length).toBeGreaterThanOrEqual(1)
    const f = findings[0]
    expect(f.ruleId).toBe('react/inline-function-overuse')
    expect(f.severity).toBe('warning')
    expect(f.message).toContain('inline')
    expect(f.suggestion).toContain('Extract')
  })

  it('respects custom maxInline threshold', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'many-inline.tsx'), { maxInline: 10 })
    expect(findings).toHaveLength(0)
  })
})

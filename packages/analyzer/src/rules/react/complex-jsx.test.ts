import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseFile } from '../../analyzer/parser.js'
import { runRule } from '../../analyzer/rule-runner.js'
import { complexJsx } from './complex-jsx.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '__fixtures__', 'complex-jsx')

function runOnFixture(fixturePath: string, options: Record<string, unknown> = {}) {
  const source = readFileSync(fixturePath, 'utf-8')
  const { ast, diagnostic } = parseFile(fixturePath, source)
  if (diagnostic || !ast) throw new Error(`Parse failed: ${diagnostic?.message}`)
  return runRule({ ast, file: fixturePath, options, rule: complexJsx })
}

describe('react/complex-jsx', () => {
  it('valid: shallow JSX (≤5 depth) produces no findings', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'valid', 'shallow-jsx.tsx'))
    expect(findings).toHaveLength(0)
  })

  it('invalid: deeply nested JSX (>5) produces a warning', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'deep-jsx.tsx'))
    expect(findings.length).toBeGreaterThanOrEqual(1)
    const f = findings[0]
    expect(f.ruleId).toBe('react/complex-jsx')
    expect(f.severity).toBe('warning')
    expect(f.message).toContain('depth')
    expect(f.suggestion).toContain('Extract')
  })

  it('respects custom maxDepth threshold', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'deep-jsx.tsx'), { maxDepth: 20 })
    expect(findings).toHaveLength(0)
  })
})

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseFile } from '../../analyzer/parser.js'
import { runRule } from '../../analyzer/rule-runner.js'
import { tooManyStates } from './too-many-states.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '__fixtures__', 'too-many-states')

function runOnFixture(fixturePath: string, options: Record<string, unknown> = {}) {
  const source = readFileSync(fixturePath, 'utf-8')
  const { ast, diagnostic } = parseFile(fixturePath, source)
  if (diagnostic || !ast) throw new Error(`Parse failed: ${diagnostic?.message}`)
  return runRule({ ast, file: fixturePath, options, rule: tooManyStates })
}

describe('react/too-many-states', () => {
  it('valid: component with ≤5 useState calls produces no findings', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'valid', 'few-states.tsx'))
    expect(findings).toHaveLength(0)
  })

  it('invalid: component with >5 useState calls produces a warning', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'many-states.tsx'))
    expect(findings.length).toBeGreaterThanOrEqual(1)
    const f = findings[0]
    expect(f.ruleId).toBe('react/too-many-states')
    expect(f.severity).toBe('warning')
    expect(f.message).toContain('useState')
    expect(f.suggestion).toContain('useReducer')
  })

  it('respects custom maxStates threshold', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'many-states.tsx'), { maxStates: 10 })
    expect(findings).toHaveLength(0)
  })
})

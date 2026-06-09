import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseFile } from '../../analyzer/parser.js'
import { runRule } from '../../analyzer/rule-runner.js'
import { tooManyProps } from './too-many-props.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '__fixtures__', 'too-many-props')

function runOnFixture(fixturePath: string, options: Record<string, unknown> = {}) {
  const source = readFileSync(fixturePath, 'utf-8')
  const { ast, diagnostic } = parseFile(fixturePath, source)
  if (diagnostic || !ast) throw new Error(`Parse failed: ${diagnostic?.message}`)
  return runRule({ ast, file: fixturePath, options, rule: tooManyProps })
}

describe('react/too-many-props', () => {
  it('valid: component with few props produces no findings', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'valid', 'few-props.tsx'))
    expect(findings).toHaveLength(0)
  })

  it('invalid: component with >7 props produces a warning', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'many-props.tsx'))
    expect(findings.length).toBeGreaterThanOrEqual(1)
    const f = findings[0]
    expect(f.ruleId).toBe('react/too-many-props')
    expect(f.severity).toBe('warning')
    expect(f.message).toContain('props')
    expect(f.suggestion).toContain('Group')
  })

  it('respects custom maxProps threshold', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'many-props.tsx'), { maxProps: 20 })
    expect(findings).toHaveLength(0)
  })
})

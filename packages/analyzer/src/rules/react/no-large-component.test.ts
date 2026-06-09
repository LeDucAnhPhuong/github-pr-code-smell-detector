import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { parseFile } from '../../analyzer/parser.js'
import { runRule } from '../../analyzer/rule-runner.js'
import { noLargeComponent } from './no-large-component.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '__fixtures__', 'no-large-component')

function runOnFixture(fixturePath: string, options: Record<string, unknown> = {}) {
  const source = readFileSync(fixturePath, 'utf-8')
  const { ast, diagnostic } = parseFile(fixturePath, source)
  if (diagnostic || !ast) throw new Error(`Parse failed: ${diagnostic?.message}`)
  return runRule({ ast, file: fixturePath, options, rule: noLargeComponent })
}

describe('react/no-large-component', () => {
  it('valid: small component produces no findings', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'valid', 'small-component.tsx'))
    expect(findings).toHaveLength(0)
  })

  it('invalid: large component (>150 lines) produces a warning finding', () => {
    const { findings } = runOnFixture(join(fixturesDir, 'invalid', 'large-component.tsx'))
    expect(findings.length).toBeGreaterThanOrEqual(1)
    const f = findings[0]
    expect(f.ruleId).toBe('react/no-large-component')
    expect(f.severity).toBe('warning')
    expect(f.message).toContain('lines')
    expect(f.suggestion).toBeTruthy()
  })

  it('respects custom maxLines threshold', () => {
    // With maxLines=200, our 165-line component should NOT fire
    const { findings } = runOnFixture(
      join(fixturesDir, 'invalid', 'large-component.tsx'),
      { maxLines: 200 },
    )
    expect(findings).toHaveLength(0)
  })

  it('finding has correct file path and range', () => {
    const fixturePath = join(fixturesDir, 'invalid', 'large-component.tsx')
    const { findings } = runOnFixture(fixturePath)
    expect(findings[0].file).toBe(fixturePath)
    expect(findings[0].range.start.line).toBeGreaterThanOrEqual(1)
  })
})

import { describe, expect, it } from 'vitest'

import type { Finding, Rule } from '../core/index.js'

import { parseFile } from './parser.js'
import { runRule, sortFindings } from './rule-runner.js'

const SIMPLE_TSX = `
export function Big() {
  return <div>hello</div>
}
`

function parseTsx(source: string) {
  const { ast } = parseFile('test.tsx', source)
  if (!ast) throw new Error('Parse failed')
  return ast
}

const stubRule: Rule = {
  create(ctx) {
    return {
      FunctionDeclaration(node) {
        const n = node as { loc?: { end: { column: number; line: number; }; start: { column: number; line: number; }; } }
        if (n.loc) {
          ctx.report({
            message: 'Found function',
            range: { end: n.loc.end, start: n.loc.start },
          })
        }
      },
    }
  },
  meta: {
    category: 'maintainability',
    defaultSeverity: 'warning',
    description: 'Test',
    id: 'react/test-rule',
    title: 'Test Rule',
  },
}

describe('runRule', () => {
  it('collects findings via ctx.report and never constructs Finding directly', () => {
    const ast = parseTsx(SIMPLE_TSX)
    const { diagnostics, findings } = runRule({
      ast,
      file: 'test.tsx',
      options: {},
      rule: stubRule,
    })
    expect(diagnostics).toHaveLength(0)
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].ruleId).toBe('react/test-rule')
    expect(findings[0].file).toBe('test.tsx')
  })

  it('isolates a crashing rule and emits a Diagnostic', () => {
    const crashingRule: Rule = {
      create() {
        return {
          Program() {
            throw new Error('Intentional crash')
          },
        }
      },
      meta: {
        category: 'maintainability',
        defaultSeverity: 'error',
        description: '',
        id: 'react/crashing',
        title: 'Crashing',
      },
    }

    const ast = parseTsx(SIMPLE_TSX)
    const { diagnostics, findings } = runRule({
      ast,
      file: 'test.tsx',
      options: {},
      rule: crashingRule,
    })
    expect(findings).toHaveLength(0)
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0].code).toBe('RULE_ERROR')
    expect(diagnostics[0].message).toContain('Intentional crash')
  })

  it('applies severity override', () => {
    const ast = parseTsx(SIMPLE_TSX)
    const { findings } = runRule({
      ast,
      file: 'test.tsx',
      options: {},
      rule: stubRule,
      severityOverride: 'error',
    })
    expect(findings.every((f) => f.severity === 'error')).toBe(true)
  })
})

describe('sortFindings', () => {
  it('sorts by (file, line, column, ruleId)', () => {
    const unsorted: Finding[] = [
      { file: 'b.tsx', message: '', range: { end: { column: 0, line: 1 }, start: { column: 0, line: 1 } }, ruleId: 'b', severity: 'warning' },
      { file: 'a.tsx', message: '', range: { end: { column: 0, line: 5 }, start: { column: 0, line: 5 } }, ruleId: 'a', severity: 'warning' },
      { file: 'a.tsx', message: '', range: { end: { column: 0, line: 3 }, start: { column: 0, line: 3 } }, ruleId: 'z', severity: 'warning' },
      { file: 'a.tsx', message: '', range: { end: { column: 5, line: 3 }, start: { column: 5, line: 3 } }, ruleId: 'a', severity: 'warning' },
    ]
    const sorted = sortFindings(unsorted)
    expect(sorted[0].file).toBe('a.tsx')
    expect(sorted[0].range.start.line).toBe(3)
    expect(sorted[0].range.start.column).toBe(0)
    expect(sorted[1].range.start.column).toBe(5)
    expect(sorted[2].range.start.line).toBe(5)
    expect(sorted[3].file).toBe('b.tsx')
  })

  it('is deterministic — same input always gives same order', () => {
    const findings: Finding[] = [
      { file: 'x.tsx', message: '', range: { end: { column: 0, line: 2 }, start: { column: 0, line: 2 } }, ruleId: 'react/b', severity: 'warning' },
      { file: 'x.tsx', message: '', range: { end: { column: 0, line: 2 }, start: { column: 0, line: 2 } }, ruleId: 'react/a', severity: 'warning' },
    ]
    const s1 = sortFindings([...findings])
    const s2 = sortFindings([...findings].reverse())
    expect(s1.map((f) => f.ruleId)).toEqual(s2.map((f) => f.ruleId))
    expect(s1[0].ruleId).toBe('react/a')
  })
})

import { describe, expect, it } from 'vitest'

import type { Finding } from '../core/index.js'

import { MARKER, renderMarkdown } from './markdown-reporter.js'

const sampleFindings: Finding[] = [
  {
    file: 'src/components/MyComp.tsx',
    message: 'Component is too large',
    range: { end: { column: 1, line: 200 }, start: { column: 0, line: 10 } },
    ruleId: 'react/no-large-component',
    severity: 'warning',
    suggestion: 'Split it up',
  },
  {
    file: 'src/components/MyComp.tsx',
    message: 'Too many props',
    range: { end: { column: 50, line: 15 }, start: { column: 2, line: 15 } },
    ruleId: 'react/too-many-props',
    severity: 'error',
  },
]

describe('renderMarkdown', () => {
  it('contains the stable HTML marker', () => {
    const output = renderMarkdown(sampleFindings, '1.0.0')
    expect(output).toContain(MARKER)
  })

  it('reports no findings clearly when findings are empty', () => {
    const output = renderMarkdown([], '1.0.0')
    expect(output).toContain('No code smell findings detected')
    expect(output).toContain(MARKER)
  })

  it('groups findings by file', () => {
    const output = renderMarkdown(sampleFindings, '1.0.0')
    expect(output).toContain('src/components/MyComp.tsx')
  })

  it('includes severity, rule, line, message and suggestion in table', () => {
    const output = renderMarkdown(sampleFindings, '1.0.0')
    expect(output).toContain('react/no-large-component')
    expect(output).toContain('Component is too large')
    expect(output).toContain('Split it up')
    expect(output).toContain('10')
  })

  it('shows summary counts', () => {
    const output = renderMarkdown(sampleFindings, '1.0.0')
    expect(output).toContain('1 error')
    expect(output).toContain('1 warning')
  })
})

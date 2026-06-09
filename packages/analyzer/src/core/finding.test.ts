import { describe, expect, it } from 'vitest'

import type { Finding, Severity } from './finding.js'

describe('Finding type', () => {
  it('accepts a valid finding object', () => {
    const f: Finding = {
      file: 'src/components/MyComp.tsx',
      message: 'Component is too large',
      range: {
        end: { column: 1, line: 200 },
        start: { column: 0, line: 1 },
      },
      ruleId: 'react/no-large-component',
      severity: 'warning' as Severity,
      suggestion: 'Split the component',
    }
    expect(f.ruleId).toBe('react/no-large-component')
    expect(f.severity).toBe('warning')
    expect(f.range.start.line).toBe(1)
    expect(f.range.start.column).toBe(0)
    expect(f.file).toBe('src/components/MyComp.tsx')
  })

  it('allows omitting suggestion', () => {
    const f: Finding = {
      file: 'src/Foo.tsx',
      message: 'Too many props',
      range: { end: { column: 0, line: 5 }, start: { column: 0, line: 1 } },
      ruleId: 'react/too-many-props',
      severity: 'warning',
    }
    expect(f.suggestion).toBeUndefined()
  })
})

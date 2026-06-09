import { describe, expect, it } from 'vitest'

import type { Finding } from '../core/index.js'

import { buildAnnotations, severityToAnnotationLevel } from './check-annotation-reporter.js'

const findings: Finding[] = [
  {
    file: 'src/Foo.tsx',
    message: 'Too large',
    range: { end: { column: 0, line: 100 }, start: { column: 0, line: 1 } },
    ruleId: 'react/no-large-component',
    severity: 'error',
  },
  {
    file: 'src/Bar.tsx',
    message: 'Too many',
    range: { end: { column: 30, line: 5 }, start: { column: 0, line: 5 } },
    ruleId: 'react/too-many-props',
    severity: 'warning',
    suggestion: 'Group them',
  },
  {
    file: 'src/Baz.tsx',
    message: 'Deep nesting',
    range: { end: { column: 50, line: 10 }, start: { column: 0, line: 10 } },
    ruleId: 'react/complex-jsx',
    severity: 'info',
  },
]

describe('severityToAnnotationLevel', () => {
  it('maps error -> failure', () => {
    expect(severityToAnnotationLevel('error')).toBe('failure')
  })

  it('maps warning -> warning', () => {
    expect(severityToAnnotationLevel('warning')).toBe('warning')
  })

  it('maps info -> notice', () => {
    expect(severityToAnnotationLevel('info')).toBe('notice')
  })
})

describe('buildAnnotations', () => {
  it('converts findings to annotations with correct fields', () => {
    const annotations = buildAnnotations(findings)
    expect(annotations).toHaveLength(3)
    expect(annotations[0].annotation_level).toBe('failure')
    expect(annotations[0].path).toBe('src/Foo.tsx')
    expect(annotations[0].start_line).toBe(1)
    expect(annotations[1].annotation_level).toBe('warning')
    expect(annotations[1].raw_details).toBe('Group them')
    expect(annotations[2].annotation_level).toBe('notice')
  })
})

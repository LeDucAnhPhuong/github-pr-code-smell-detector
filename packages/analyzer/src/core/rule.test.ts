import { describe, expect, it, vi } from 'vitest'

import type { Rule, RuleContext } from './rule.js'

describe('Rule contract', () => {
  it('can define a rule that emits findings via ctx.report', () => {
    const findings: unknown[] = []

    const stubRule: Rule = {
      create(ctx: RuleContext) {
        return {
          Identifier(node) {
            ctx.report({
              message: 'Found identifier',
              range: { end: { column: 5, line: 1 }, start: { column: 0, line: 1 } },
            })
          },
        }
      },
      meta: {
        category: 'maintainability',
        defaultSeverity: 'warning',
        description: 'Test stub',
        id: 'react/stub-rule',
        title: 'Stub Rule',
      },
    }

    expect(stubRule.meta.id).toBe('react/stub-rule')
    expect(stubRule.meta.category).toBe('maintainability')
    expect(stubRule.meta.defaultSeverity).toBe('warning')
    expect(typeof stubRule.create).toBe('function')
  })
})

import { describe, expect, it } from 'vitest'

import { ALL_RULES, getRuleById } from './registry.js'

describe('Rule registry', () => {
  it('contains all 6 React rules', () => {
    const reactRuleIds = ALL_RULES.filter((r) => r.meta.id.startsWith('react/')).map((r) => r.meta.id)
    expect(reactRuleIds).toContain('react/no-large-component')
    expect(reactRuleIds).toContain('react/too-many-props')
    expect(reactRuleIds).toContain('react/too-many-states')
    expect(reactRuleIds).toContain('react/complex-jsx')
    expect(reactRuleIds).toContain('react/inline-function-overuse')
    expect(reactRuleIds).toContain('react/mixed-responsibility')
    expect(reactRuleIds).toHaveLength(6)
  })

  it('each rule has a unique meta.id', () => {
    const ids = ALL_RULES.map((r) => r.meta.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('each rule has category: maintainability', () => {
    for (const rule of ALL_RULES) {
      expect(rule.meta.category).toBe('maintainability')
    }
  })

  it('getRuleById returns the correct rule', () => {
    const rule = getRuleById('react/no-large-component')
    expect(rule?.meta.id).toBe('react/no-large-component')
  })

  it('getRuleById returns undefined for unknown rule', () => {
    expect(getRuleById('nonexistent/rule')).toBeUndefined()
  })
})

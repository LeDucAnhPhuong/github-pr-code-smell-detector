import { describe, expect, it } from 'vitest'

import { AnalyzerConfigSchema } from './schema.js'

describe('AnalyzerConfigSchema', () => {
  it('applies defaults when given empty object', () => {
    const result = AnalyzerConfigSchema.parse({})
    expect(result.blocking).toBe(false)
    expect(result.rules).toEqual({})
    expect(Array.isArray(result.targetPaths)).toBe(true)
    expect(Array.isArray(result.excludePaths)).toBe(true)
  })

  it('accepts blocking: true', () => {
    const result = AnalyzerConfigSchema.parse({ blocking: true })
    expect(result.blocking).toBe(true)
  })

  it('accepts rule config with enabled, severity, threshold', () => {
    const result = AnalyzerConfigSchema.parse({
      rules: {
        'react/no-large-component': {
          blocking: true,
          enabled: false,
          severity: 'error',
          threshold: 200,
        },
      },
    })
    expect(result.rules['react/no-large-component']?.enabled).toBe(false)
    expect(result.rules['react/no-large-component']?.severity).toBe('error')
    expect(result.rules['react/no-large-component']?.threshold).toBe(200)
    expect(result.rules['react/no-large-component']?.blocking).toBe(true)
  })

  it('rejects invalid severity value', () => {
    expect(() =>
      AnalyzerConfigSchema.parse({ rules: { 'react/x': { severity: 'critical' } } }),
    ).toThrow()
  })

  it('rejects non-integer threshold', () => {
    expect(() =>
      AnalyzerConfigSchema.parse({ rules: { 'react/x': { threshold: 'not-a-number' } } }),
    ).toThrow()
  })
})

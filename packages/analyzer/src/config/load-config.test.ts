import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Logger } from '../core/index.js'

import { ConfigError, loadConfig } from './load-config.js'

function makeLogger(): Logger {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }
}

describe('loadConfig', () => {
  it('returns defaults when config file does not exist', () => {
    const logger = makeLogger()
    const { config, usedDefaults } = loadConfig('/nonexistent/path/config.yml', logger)
    expect(usedDefaults).toBe(true)
    expect(config.blocking).toBe(false)
    expect(config.rules).toEqual({})
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('default'))
  })

  it('parses a valid YAML config', () => {
    const logger = makeLogger()
    const tmpFile = join(tmpdir(), `test-config-${Date.now()}.yml`)
    writeFileSync(tmpFile, `blocking: true\nrules:\n  react/no-large-component:\n    threshold: 200\n`)
    try {
      const { config, usedDefaults } = loadConfig(tmpFile, logger)
      expect(usedDefaults).toBe(false)
      expect(config.blocking).toBe(true)
      expect(config.rules['react/no-large-component']?.threshold).toBe(200)
    } finally {
      unlinkSync(tmpFile)
    }
  })

  it('throws ConfigError for invalid field value', () => {
    const logger = makeLogger()
    const tmpFile = join(tmpdir(), `test-config-bad-${Date.now()}.yml`)
    writeFileSync(tmpFile, `rules:\n  react/no-large-component:\n    threshold: "not-a-number"\n`)
    try {
      expect(() => loadConfig(tmpFile, logger)).toThrow(ConfigError)
    } finally {
      unlinkSync(tmpFile)
    }
  })

  it('handles empty config file as defaults', () => {
    const logger = makeLogger()
    const tmpFile = join(tmpdir(), `test-config-empty-${Date.now()}.yml`)
    writeFileSync(tmpFile, '')
    try {
      const { config } = loadConfig(tmpFile, logger)
      expect(config.blocking).toBe(false)
    } finally {
      unlinkSync(tmpFile)
    }
  })
})

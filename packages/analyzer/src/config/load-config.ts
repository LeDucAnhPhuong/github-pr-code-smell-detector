import { load as parseYaml } from 'js-yaml'
import { existsSync, readFileSync } from 'node:fs'

import type { Logger } from '../core/index.js'

import { type AnalyzerConfig, AnalyzerConfigSchema } from './schema.js'

export interface LoadConfigResult {
  config: AnalyzerConfig
  usedDefaults: boolean
}

export function loadConfig(configPath: string, logger: Logger): LoadConfigResult {
  if (!existsSync(configPath)) {
    logger.info('No configuration file found. Using default configuration.')
    const config = AnalyzerConfigSchema.parse({})
    return { config, usedDefaults: true }
  }

  let raw: unknown
  try {
    const content = readFileSync(configPath, 'utf8')
    raw = parseYaml(content)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ConfigError(`Failed to parse configuration file at ${configPath}: ${message}`)
  }

  const result = AnalyzerConfigSchema.safeParse(raw ?? {})
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new ConfigError(`Invalid configuration at ${configPath}:\n${issues}`)
  }

  return { config: result.data, usedDefaults: false }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

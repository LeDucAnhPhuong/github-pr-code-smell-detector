import { Command, Flags } from '@oclif/core'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { analyze } from '../analyzer/analyzer.js'
import { ConfigError, loadConfig } from '../config/load-config.js'
import { ConsoleLogger } from '../core/index.js'
import { GitAllFilesProvider, GitChangedFileProvider } from '../file-selection/git-changed-file-provider.js'
import { renderJson } from '../reporters/json-reporter.js'

export default class Analyze extends Command {
  static override description = 'Analyze a repository for React/Next.js code smells'
static override flags = {
    'base-ref': Flags.string({
      description: 'Git base ref for changed-file detection (e.g. main, HEAD~1)',
    }),
    config: Flags.string({
      char: 'c',
      default: '.github/code-smell-detector.yml',
      description: 'Path to the configuration file',
    }),
    format: Flags.string({
      default: 'json',
      description: 'Output format',
      options: ['json'],
    }),
    repo: Flags.string({
      char: 'r',
      default: '.',
      description: 'Path to the repository root',
    }),
  }

  async run(): Promise<void> {
    const { flags } = await this.parse(Analyze)
    const logger = new ConsoleLogger()

    // Validate repo path
    const repoPath = resolve(flags.repo)
    if (!existsSync(repoPath)) {
      logger.error(`Repository path does not exist: ${repoPath}`)
      this.exit(2)
    }

    // Load config
    let config
    try {
      const configPath = resolve(repoPath, flags.config)
      const result = loadConfig(configPath, logger)
      config = result.config
    } catch (error: unknown) {
      if (error instanceof ConfigError) {
        logger.error(error.message)
      } else {
        logger.error(`Unexpected error loading config: ${String(error)}`)
      }

      this.exit(2)
    }

    // Build changed-file provider
    const baseRef = flags['base-ref']
    const provider = baseRef
      ? new GitChangedFileProvider(repoPath, baseRef)
      : new GitAllFilesProvider(repoPath)

    // Run analysis
    let result
    try {
      result = await analyze({
        changedFileProvider: provider,
        config: config!,
        logger,
        repoPath,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`Analysis failed: ${message}`)
      this.exit(2)
    }

    // Output
    const {version} = this.config
    const output = renderJson(result!.findings, version)
    this.log(output)

    // Log diagnostics to stderr
    for (const d of result!.diagnostics) {
      logger.warning(`[diagnostic] ${d.message}`)
    }

    // Exit code
    const hasBlockingFindings =
      config!.blocking && result!.findings.some((f) => f.severity === 'error')
    if (hasBlockingFindings) {
      this.exit(1)
    }
  }
}

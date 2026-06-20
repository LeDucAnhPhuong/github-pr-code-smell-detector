import type { AnalyzerConfig } from '../config/schema.js'
import type { Diagnostic, Finding, Logger } from '../core/index.js'
import type { ChangedFileProvider } from '../file-selection/changed-file-provider.js'
import type { ContentProvider } from '../file-selection/content-provider.js'

import { FsContentProvider } from '../file-selection/fs-content-provider.js'
import { filterTargetFiles } from '../file-selection/target-filter.js'
import { ALL_RULES } from '../rules/registry.js'
import { parseFile } from './parser.js'
import { runRule, sortFindings } from './rule-runner.js'

export interface AnalyzerOptions {
  changedFileProvider: ChangedFileProvider
  config: AnalyzerConfig
  /** Source of file contents. Defaults to reading from disk under `repoPath`. */
  contentProvider?: ContentProvider
  logger: Logger
  repoPath: string
}

export interface AnalyzerResult {
  diagnostics: Diagnostic[]
  filesAnalyzed: number
  filesSkipped: number
  findings: Finding[]
}

export async function analyze(options: AnalyzerOptions): Promise<AnalyzerResult> {
  const { changedFileProvider, config, logger, repoPath } = options
  const contentProvider = options.contentProvider ?? new FsContentProvider(repoPath)

  // 1. Get changed files
  let changedFiles: string[]
  try {
    changedFiles = await changedFileProvider.getChangedFiles()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to get changed files: ${message}`)
  }

  logger.info(`Found ${changedFiles.length} changed file(s).`)

  // 2. Filter to React/Next.js target files
  const { included, skippedCount } = filterTargetFiles(changedFiles, {
    excludePaths: config.excludePaths,
    targetPaths: config.targetPaths,
  })

  logger.info(`Analyzing ${included.length} file(s), skipping ${skippedCount}.`)

  // 3. Determine which rules to run
  const enabledRules = ALL_RULES.filter((rule) => {
    const ruleConfig = config.rules[rule.meta.id]
    if (ruleConfig?.enabled === false) return false
    return true
  })

  const allFindings: Finding[] = []
  const allDiagnostics: Diagnostic[] = []

  // 4. Parse and run rules per file
  for (const relPath of included) {
    // eslint-disable-next-line no-await-in-loop
    const source = await contentProvider.read(relPath)
    if (source === null) {
      allDiagnostics.push({
        code: 'FILE_READ_ERROR',
        file: relPath,
        message: `Cannot read file: ${relPath}`,
        severity: 'error',
      })
      continue
    }

    const { ast, diagnostic } = parseFile(relPath, source)
    if (diagnostic) {
      allDiagnostics.push(diagnostic)
      continue
    }

    if (!ast) continue

    for (const rule of enabledRules) {
      const ruleConfig = config.rules[rule.meta.id]
      const options: Record<string, unknown> = {}
      if (ruleConfig?.threshold !== undefined) {
        options.maxLines = ruleConfig.threshold
        options.threshold = ruleConfig.threshold
      }

      const severityOverride = ruleConfig?.severity ?? undefined

      const { diagnostics, findings } = runRule({
        ast,
        file: relPath,
        options,
        rule,
        severityOverride,
      })

      allFindings.push(...findings)
      allDiagnostics.push(...diagnostics)
    }
  }

  // 5. Sort findings deterministically
  const sortedFindings = sortFindings(allFindings)

  return {
    diagnostics: allDiagnostics,
    filesAnalyzed: included.length,
    filesSkipped: skippedCount,
    findings: sortedFindings,
  }
}

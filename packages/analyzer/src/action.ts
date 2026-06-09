/**
 * GitHub Action entry point — thin wrapper over the analyzer.
 * No analysis logic lives here; it only wires inputs, builds providers, and runs reporters.
 */
import * as core from '@actions/core'
import * as github from '@actions/github'
import { resolve } from 'node:path'

import type { Logger } from './core/index.js'

import { analyze } from './analyzer/analyzer.js'
import { ConfigError, loadConfig } from './config/load-config.js'
import { publishCheckRun } from './github/check-run.js'
import { createOctokit } from './github/client.js'
import { upsertPrComment } from './github/pr-comment.js'
import { buildJsonOutput } from './reporters/json-reporter.js'
import { renderMarkdown } from './reporters/markdown-reporter.js'

const actionLogger: Logger = {
  debug: (msg) => core.debug(msg),
  error: (msg) => core.error(msg),
  info: (msg) => core.info(msg),
  warning: (msg) => core.warning(msg),
}

const token = core.getInput('github-token', { required: true })
const configPath = core.getInput('config-path') || '.github/code-smell-detector.yml'
const blockingInput = core.getInput('blocking') === 'true'
const repoPath = process.env.GITHUB_WORKSPACE ?? process.cwd()

// Load config
let config
try {
  const result = loadConfig(resolve(repoPath, configPath), actionLogger)
  config = result.config
  if (blockingInput) config = { ...config, blocking: true }
} catch (error: unknown) {
  if (error instanceof ConfigError) {
    core.setFailed(error.message)
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(2)
  }

  throw error
}

const prNumber = github.context.payload.pull_request?.number
if (!prNumber) {
  core.warning('No pull_request event context found. Skipping analysis.')
} else {
  const { GitHubChangedFileProvider } = await import('./file-selection/github-changed-file-provider.js')
  const provider = new GitHubChangedFileProvider(
    token,
    github.context.repo.owner,
    github.context.repo.repo,
    prNumber,
  )

  try {
    const result = await analyze({ changedFileProvider: provider, config, logger: actionLogger, repoPath })

    const version = '0.0.0'
    const jsonOut = buildJsonOutput(result.findings, version)

    core.setOutput('findings-count', String(jsonOut.summary.total))
    core.setOutput('error-count', String(jsonOut.summary.error))
    core.setOutput('warning-count', String(jsonOut.summary.warning))
    core.info(`Analysis complete: ${jsonOut.summary.total} finding(s) (${jsonOut.summary.error} error, ${jsonOut.summary.warning} warning)`)

    const octokit = createOctokit(token)
    const { owner, repo } = github.context.repo

    await upsertPrComment({
      body: renderMarkdown(result.findings, version),
      logger: actionLogger,
      octokit,
      owner,
      prNumber,
      repo,
    })

    const sha = github.context.payload.pull_request?.head?.sha ?? github.context.sha
    const hasBlockingFindings = config.blocking && result.findings.some((f) => f.severity === 'error')

    await publishCheckRun({
      findings: result.findings,
      hasBlockingFindings: Boolean(hasBlockingFindings),
      logger: actionLogger,
      octokit,
      owner,
      repo,
      sha,
    })

    if (hasBlockingFindings) {
      core.setFailed(`Blocking findings detected: ${jsonOut.summary.error} error(s)`)
      // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
      process.exit(1)
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    core.setFailed(`Action failed: ${message}`)
    // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
    process.exit(2)
  }
}

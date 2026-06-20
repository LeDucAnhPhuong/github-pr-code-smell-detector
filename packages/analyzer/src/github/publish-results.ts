import type { Finding, Logger } from '../core/index.js'

import { renderMarkdown } from '../reporters/markdown-reporter.js'
import { publishCheckRun } from './check-run.js'
import { createOctokit } from './client.js'
import { upsertPrComment } from './pr-comment.js'

export interface PublishPrResultsOptions {
  blocking: boolean
  findings: Finding[]
  logger: Logger
  owner: string
  prNumber: number
  /** When false, skip publishing the Check run (e.g. plan without check annotations). */
  publishCheck?: boolean
  repo: string
  sha: string
  token: string
  version: string
}

/**
 * High-level helper: render the Markdown report, upsert the single PR comment,
 * and (optionally) publish the Check run. The Octokit instance is built internally
 * from the token so callers only need to supply a token.
 */
export async function publishPrResults(opts: PublishPrResultsOptions): Promise<void> {
  const octokit = createOctokit(opts.token)

  await upsertPrComment({
    body: renderMarkdown(opts.findings, opts.version),
    logger: opts.logger,
    octokit,
    owner: opts.owner,
    prNumber: opts.prNumber,
    repo: opts.repo,
  })

  if (opts.publishCheck === false) return

  const hasBlockingFindings = opts.blocking && opts.findings.some((f) => f.severity === 'error')

  await publishCheckRun({
    findings: opts.findings,
    hasBlockingFindings,
    logger: opts.logger,
    octokit,
    owner: opts.owner,
    repo: opts.repo,
    sha: opts.sha,
  })
}

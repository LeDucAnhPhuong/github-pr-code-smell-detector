import type { Finding, Logger } from '../core/index.js'
import type { Octokit } from './client.js'

import { buildAnnotations } from '../reporters/check-annotation-reporter.js'

const CHECK_NAME = 'Code Smell Detector'

export interface PublishCheckOptions {
  findings: Finding[]
  hasBlockingFindings: boolean
  logger: Logger
  octokit: Octokit
  owner: string
  repo: string
  sha: string
}

export async function publishCheckRun(opts: PublishCheckOptions): Promise<void> {
  const { findings, hasBlockingFindings, logger, octokit, owner, repo, sha } = opts

  const annotations = buildAnnotations(findings)
  const conclusion = hasBlockingFindings ? 'failure' : 'success'

  const summary =
    findings.length === 0
      ? 'No code smell findings detected.'
      : `${findings.length} finding(s): ${findings.filter((f) => f.severity === 'error').length} error, ${findings.filter((f) => f.severity === 'warning').length} warning`

  try {
    const BATCH_SIZE = 50
    const firstBatch = annotations.slice(0, BATCH_SIZE)

    /* eslint-disable camelcase */
    const checkRun = await octokit.rest.checks.create({
      conclusion,
      head_sha: sha,
      name: CHECK_NAME,
      output: { annotations: firstBatch, summary, title: 'Code Smell Analysis' },
      owner,
      repo,
      status: 'completed',
    })

    // Batch-publish remaining annotations (GitHub API limit = 50 per request)
    for (let i = BATCH_SIZE; i < annotations.length; i += BATCH_SIZE) {
      // eslint-disable-next-line no-await-in-loop
      await octokit.rest.checks.update({
        check_run_id: checkRun.data.id,
        output: {
          annotations: annotations.slice(i, i + BATCH_SIZE),
          summary,
          title: 'Code Smell Analysis',
        },
        owner,
        repo,
      })
    }
    /* eslint-enable camelcase */

    logger.info(`Published Check run with ${annotations.length} annotation(s), conclusion: ${conclusion}`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warning(`Failed to publish Check annotations (checks:write permission may be missing): ${message}`)
  }
}

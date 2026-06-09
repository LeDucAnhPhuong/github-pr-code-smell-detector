import type { Logger } from '../core/index.js'
import type { Octokit } from './client.js'

import { MARKER } from '../reporters/markdown-reporter.js'

export interface UpsertCommentOptions {
  body: string
  logger: Logger
  octokit: Octokit
  owner: string
  prNumber: number
  repo: string
}

/**
 * Creates or updates a single consolidated PR comment identified by the stable marker.
 * Re-runs update the same comment instead of creating duplicates.
 */
export async function upsertPrComment(opts: UpsertCommentOptions): Promise<void> {
  const { body, logger, octokit, owner, prNumber, repo } = opts

  let existingCommentId: number | undefined

  /* eslint-disable camelcase */
  const comments = await octokit.rest.issues.listComments({
    issue_number: prNumber,
    owner,
    per_page: 100,
    repo,
  })

  for (const comment of comments.data) {
    if (comment.body?.includes(MARKER)) {
      existingCommentId = comment.id
      break
    }
  }

  if (existingCommentId === undefined) {
    await octokit.rest.issues.createComment({ body, issue_number: prNumber, owner, repo })
    logger.info('Created new PR comment')
  } else {
    await octokit.rest.issues.updateComment({ body, comment_id: existingCommentId, owner, repo })
    logger.info(`Updated existing PR comment #${existingCommentId}`)
  }
  /* eslint-enable camelcase */
}

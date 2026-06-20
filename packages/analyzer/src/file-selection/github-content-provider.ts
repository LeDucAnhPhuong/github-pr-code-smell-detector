import { getOctokit } from '@actions/github'

import type { ContentProvider } from './content-provider.js'

/** Reads file source through the GitHub Contents API at a given ref (no checkout needed). */
export class GitHubContentProvider implements ContentProvider {
  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repo: string,
    private readonly ref: string,
  ) {}

  async read(relPath: string): Promise<null | string> {
    const octokit = getOctokit(this.token)
    try {
      const res = await octokit.rest.repos.getContent({
        owner: this.owner,
        path: relPath,
        ref: this.ref,
        repo: this.repo,
      })

      const data = res.data as { content?: string; encoding?: string }
      if (!data.content) return null
      const encoding: BufferEncoding = data.encoding === 'base64' ? 'base64' : 'utf8'
      return Buffer.from(data.content, encoding).toString('utf8')
    } catch {
      return null
    }
  }
}

import { getOctokit } from '@actions/github'

import type { ChangedFileProvider } from './changed-file-provider.js'

import { toPosixPath } from './target-filter.js'

export class GitHubChangedFileProvider implements ChangedFileProvider {
  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repo: string,
    private readonly prNumber: number,
  ) {}

  async getChangedFiles(): Promise<string[]> {
    const octokit = getOctokit(this.token)
    const files: string[] = []
    let page = 1

    // Paginate through all changed files
    // eslint-disable-next-line no-await-in-loop
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const response = await octokit.rest.pulls.listFiles({
        owner: this.owner,
        page,
        /* eslint-disable camelcase */
        per_page: 100,
        pull_number: this.prNumber,
        /* eslint-enable camelcase */
        repo: this.repo,
      })

      for (const file of response.data) {
        if (file.status !== 'removed') {
          files.push(toPosixPath(file.filename))
        }
      }

      if (response.data.length < 100) break
      page++
    }

    return files
  }
}

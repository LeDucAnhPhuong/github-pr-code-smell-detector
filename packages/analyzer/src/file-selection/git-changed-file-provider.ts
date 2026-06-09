import { execSync } from 'node:child_process'

import type { ChangedFileProvider } from './changed-file-provider.js'

import { toPosixPath } from './target-filter.js'

export class GitChangedFileProvider implements ChangedFileProvider {
  constructor(
    private readonly repoPath: string,
    private readonly baseRef: string,
    private readonly headRef: string = 'HEAD',
  ) {}

  async getChangedFiles(): Promise<string[]> {
    const output = execSync(
      `git diff --name-only --diff-filter=ACMR ${this.baseRef}...${this.headRef}`,
      { cwd: this.repoPath, encoding: 'utf8' },
    )
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((f) => toPosixPath(f))
  }
}

/** Provider that returns all tracked files (for analyzing entire repo) */
export class GitAllFilesProvider implements ChangedFileProvider {
  constructor(private readonly repoPath: string) {}

  async getChangedFiles(): Promise<string[]> {
    const output = execSync('git ls-files', {
      cwd: this.repoPath,
      encoding: 'utf8',
    })
    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((f) => toPosixPath(f))
  }
}

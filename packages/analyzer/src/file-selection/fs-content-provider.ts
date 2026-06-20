import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import type { ContentProvider } from './content-provider.js'

/** Reads files from the local filesystem, relative to a repo root. (Default for CLI / GitHub Action.) */
export class FsContentProvider implements ContentProvider {
  constructor(private readonly repoPath: string) {}

  async read(relPath: string): Promise<null | string> {
    try {
      return readFileSync(resolve(join(this.repoPath, relPath)), 'utf8')
    } catch {
      return null
    }
  }
}

/**
 * Abstraction for reading file source by repo-relative path.
 * Lets `analyze()` work either from disk (CLI/Action) or remotely (web worker via GitHub API).
 */
export interface ContentProvider {
  /** Return the file source, or null if it cannot be read. relPath uses POSIX '/' separators. */
  read(relPath: string): Promise<null | string>
}

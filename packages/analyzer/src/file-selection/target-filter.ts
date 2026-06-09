import { extname } from 'node:path'

const SUPPORTED_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\/dist\//,
  /\\dist\\/,
  /\/\.next\//,
  /\\\.next\\/,
  /\/out\//,
  /\\out\\/,
  /\/build\//,
  /\\build\\/,
  /\/coverage\//,
  /\\coverage\\/,
]

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /(^|\/)__tests__(\/|$)/,
]

const DEFAULT_TARGET_PATHS = ['app', 'pages', 'components', 'hooks', 'features', 'src']

export function toPosixPath(p: string): string {
  return p.replaceAll('\\', '/')
}

/**
 * Build regex patterns that match a path segment at the start of the path
 * OR anywhere inside it (e.g. 'hooks' matches 'hooks/useFoo.ts' and 'src/hooks/useFoo.ts').
 */
function buildTargetPatterns(paths: string[]): RegExp[] {
  return paths.map((segment) => {
    const escaped = segment.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    return new RegExp(`(^|[/\\\\])${escaped}([/\\\\]|$)`)
  })
}

export interface FilterResult {
  included: string[]
  skippedCount: number
}

export interface FilterOptions {
  excludePaths?: string[]
  targetPaths?: string[]
}

export function filterTargetFiles(files: string[], options?: FilterOptions): FilterResult {
  const customExcludes = (options?.excludePaths ?? []).map(
    (p) => new RegExp(p.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)),
  )

  const targetPatterns = buildTargetPatterns(
    options?.targetPaths?.length ? options.targetPaths : DEFAULT_TARGET_PATHS,
  )

  let skippedCount = 0
  const included: string[] = []

  for (const file of files) {
    const posix = toPosixPath(file)
    const ext = extname(posix)

    if (!SUPPORTED_EXTENSIONS.has(ext)) {
      skippedCount++
      continue
    }

    if (EXCLUDE_PATTERNS.some((p) => p.test(posix)) || customExcludes.some((p) => p.test(posix))) {
      skippedCount++
      continue
    }

    if (TEST_PATTERNS.some((p) => p.test(posix))) {
      skippedCount++
      continue
    }

    // .jsx and .tsx are always included (as long as not excluded above)
    if (ext === '.jsx' || ext === '.tsx') {
      included.push(posix)
      continue
    }

    // .js and .ts only if path matches one of the target path segments
    if (targetPatterns.some((p) => p.test(posix))) {
      included.push(posix)
      continue
    }

    skippedCount++
  }

  return { included, skippedCount }
}

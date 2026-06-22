/**
 * File selection + capping for Overview indexing (plan 02, step 2).
 *
 * A repo can be huge, so before sending anything to the LLM we (a) drop noise
 * (deps, build output, lockfiles, binaries, generated/oversize files) and
 * (b) hard-cap total file count and bytes so one giant repo can't burn the
 * budget. When the cap bites, high-signal files (manifests, configs, entry
 * points, README, src/) are kept first.
 *
 * Pure + dependency-free so it can be unit tested without GitHub.
 */

export interface SelectableFile {
  /** Repo-root-relative path. */
  path: string;
  /** Size in bytes. */
  size: number;
}

export interface SelectOptions {
  /** Max number of files to keep. */
  maxFiles: number;
  /** Max total bytes across kept files. */
  maxBytes: number;
  /** Skip any single file larger than this. */
  maxFileBytes: number;
}

export interface SelectionResult {
  selected: SelectableFile[];
  totalBytes: number;
  /** Excluded by filter rules (noise / oversize / binary). */
  droppedFiltered: number;
  /** Excluded only because a cap was reached. */
  droppedCap: number;
}

export function defaultSelectOptions(): SelectOptions {
  return {
    maxFiles: Number(process.env.OVERVIEW_MAX_FILES ?? 400),
    maxBytes: Number(process.env.OVERVIEW_MAX_BYTES ?? 1_500_000),
    maxFileBytes: Number(process.env.OVERVIEW_MAX_FILE_BYTES ?? 100_000),
  };
}

// Directory segments to drop entirely (deps, build output, caches, vcs).
const EXCLUDED_DIRS = new Set([
  "node_modules",
  "bower_components",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".cache",
  "coverage",
  ".nyc_output",
  "vendor",
  ".git",
  ".github", // workflows aren't needed for a project summary
  "__pycache__",
  ".venv",
  "venv",
  ".mypy_cache",
  ".pytest_cache",
  "target", // rust / java
  "bin",
  "obj",
  ".idea",
  ".vscode",
  "Pods",
  "DerivedData",
]);

// Exact filenames to drop (lockfiles + misc noise).
const EXCLUDED_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "npm-shrinkwrap.json",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
  "composer.lock",
  "Gemfile.lock",
  "go.sum",
  ".ds_store",
]);

// Binary / media / non-source extensions (lowercased, with dot).
const EXCLUDED_EXTS = new Set([
  // images
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg", ".avif", ".tiff",
  // fonts
  ".woff", ".woff2", ".ttf", ".otf", ".eot",
  // media
  ".mp3", ".mp4", ".wav", ".mov", ".avi", ".webm", ".ogg", ".flac",
  // archives / binaries
  ".zip", ".tar", ".gz", ".tgz", ".rar", ".7z", ".bz2", ".xz",
  ".pdf", ".exe", ".dll", ".so", ".dylib", ".bin", ".wasm", ".class", ".jar",
  ".node", ".pyc", ".o", ".a", ".lib",
  // data dumps / sourcemaps
  ".map", ".lock", ".log", ".sqlite", ".db",
]);

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return i >= 0 ? path.slice(i + 1) : path;
}

function ext(path: string): string {
  const name = basename(path);
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i).toLowerCase() : "";
}

/** True when a path is noise we never want to index. */
export function isExcluded(path: string): boolean {
  const segments = path.split("/");
  if (segments.some((s) => EXCLUDED_DIRS.has(s))) return true;

  const name = basename(path).toLowerCase();
  if (EXCLUDED_FILES.has(name)) return true;

  // generated / minified
  if (name.endsWith(".min.js") || name.endsWith(".min.css")) return true;
  if (name.endsWith(".d.ts")) return true; // type decls, low signal
  if (name.endsWith(".snap")) return true; // jest snapshots

  if (EXCLUDED_EXTS.has(ext(path))) return true;

  return false;
}

// Manifest / high-priority filenames kept first when capping.
const MANIFEST_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "readme.md",
  "readme",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "go.mod",
  "cargo.toml",
  "composer.json",
  "gemfile",
  "pom.xml",
  "build.gradle",
  "next.config.js",
  "next.config.ts",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "nest-cli.json",
  "angular.json",
  "nuxt.config.ts",
  "svelte.config.js",
  "dockerfile",
  "docker-compose.yml",
  "schema.prisma",
]);

const ENTRY_HINTS = ["src/index", "src/main", "src/app", "app/", "pages/", "main.", "index."];

/** Lower = more important; kept first when a cap is reached. */
export function priority(path: string): number {
  const name = basename(path).toLowerCase();
  const depth = path.split("/").length - 1;

  if (MANIFEST_FILES.has(name)) return 0;
  if (depth === 0) return 1; // any top-level config/file
  if (ENTRY_HINTS.some((h) => path.startsWith(h) || name.startsWith(h))) return 2;
  if (path.startsWith("src/") || path.startsWith("lib/") || path.startsWith("app/")) return 3;
  return 4;
}

/**
 * Apply filters then caps. Input is the list of blob entries from the git tree.
 * Files with unknown size are treated as size 0 for the byte cap (the content
 * fetch still respects maxFileBytes downstream).
 */
export function selectIndexableFiles(
  files: SelectableFile[],
  opts: SelectOptions = defaultSelectOptions()
): SelectionResult {
  let droppedFiltered = 0;

  const kept = files.filter((f) => {
    if (isExcluded(f.path)) {
      droppedFiltered++;
      return false;
    }
    if (f.size > opts.maxFileBytes) {
      droppedFiltered++;
      return false;
    }
    return true;
  });

  // Order by priority, then by path for stable output.
  kept.sort((a, b) => priority(a.path) - priority(b.path) || a.path.localeCompare(b.path));

  const selected: SelectableFile[] = [];
  let totalBytes = 0;
  let droppedCap = 0;

  for (const f of kept) {
    if (selected.length >= opts.maxFiles || totalBytes + f.size > opts.maxBytes) {
      droppedCap++;
      continue;
    }
    selected.push(f);
    totalBytes += f.size;
  }

  return { selected, totalBytes, droppedFiltered, droppedCap };
}

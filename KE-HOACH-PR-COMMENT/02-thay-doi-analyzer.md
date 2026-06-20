# 02 — Thay đổi `packages/analyzer`

> Mục tiêu: cho phép **web worker** gọi lại engine mà **không cần repo trên đĩa**, và tái dùng phần comment/check sẵn có. Giữ nguyên hành vi cho CLI + GitHub Action.

## Vấn đề cần giải

`analyze()` (trong `src/analyzer/analyzer.ts`) đọc file bằng `readFileSync(join(repoPath, relPath))`. GitHub Action OK vì có `actions/checkout`. **Worker thì không có checkout** — chỉ có token + owner/repo/prNumber. ⇒ Cần tách "lấy nội dung file" thành một interface tiêm vào được.

## Thay đổi 1 — Thêm `ContentProvider`

**File mới:** `src/file-selection/content-provider.ts`

```ts
export interface ContentProvider {
  /** Trả về source của file (đường dẫn tương đối, POSIX), hoặc null nếu không đọc được. */
  read(relPath: string): Promise<string | null>
}
```

**File mới:** `src/file-selection/fs-content-provider.ts` — hành vi hiện tại (đọc đĩa):

```ts
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { ContentProvider } from './content-provider.js'

export class FsContentProvider implements ContentProvider {
  constructor(private readonly repoPath: string) {}
  async read(relPath: string): Promise<string | null> {
    try { return readFileSync(resolve(join(this.repoPath, relPath)), 'utf8') }
    catch { return null }
  }
}
```

**File mới:** `src/file-selection/github-content-provider.ts` — đọc qua API:

```ts
import { getOctokit } from '@actions/github'
import type { ContentProvider } from './content-provider.js'

export class GitHubContentProvider implements ContentProvider {
  constructor(
    private readonly token: string,
    private readonly owner: string,
    private readonly repo: string,
    private readonly ref: string,     // commit SHA của PR head
  ) {}
  async read(relPath: string): Promise<string | null> {
    const octokit = getOctokit(this.token)
    try {
      const res = await octokit.rest.repos.getContent({
        owner: this.owner, repo: this.repo, path: relPath, ref: this.ref,
      })
      const data = res.data as { content?: string; encoding?: string }
      if (!data.content) return null
      return Buffer.from(data.content, (data.encoding as BufferEncoding) ?? 'base64').toString('utf8')
    } catch { return null }
  }
}
```

## Thay đổi 2 — `analyze()` nhận `contentProvider`

Trong `src/analyzer/analyzer.ts`:

- Thêm field tùy chọn vào `AnalyzerOptions`:
  ```ts
  export interface AnalyzerOptions {
    changedFileProvider: ChangedFileProvider
    config: AnalyzerConfig
    logger: Logger
    repoPath: string
    contentProvider?: ContentProvider   // MỚI — mặc định FsContentProvider(repoPath)
  }
  ```
- Đầu hàm: `const content = options.contentProvider ?? new FsContentProvider(repoPath)`
- Trong vòng lặp file, **thay** khối `readFileSync(...)` bằng:
  ```ts
  const source = await content.read(relPath)
  if (source === null) {
    allDiagnostics.push({ code: 'FILE_READ_ERROR', file: relPath, message: `Cannot read file: ${relPath}`, severity: 'error' })
    continue
  }
  ```

> Tương thích ngược: CLI/Action không truyền `contentProvider` ⇒ tự dùng `FsContentProvider(repoPath)` ⇒ hành vi y như cũ. Cập nhật test `analyzer` nếu có test trực tiếp khối đọc file.

## Thay đổi 3 — Helper bắn kết quả lên PR (gói gọn cho worker)

**File mới:** `src/github/publish-results.ts`

```ts
import type { Finding, Logger } from '../core/index.js'
import { createOctokit } from './client.js'
import { upsertPrComment } from './pr-comment.js'
import { publishCheckRun } from './check-run.js'
import { renderMarkdown } from '../reporters/markdown-reporter.js'

export interface PublishPrResultsOptions {
  token: string
  owner: string
  repo: string
  prNumber: number
  sha: string
  findings: Finding[]
  blocking: boolean
  version: string
  logger: Logger
}

export async function publishPrResults(o: PublishPrResultsOptions): Promise<void> {
  const octokit = createOctokit(o.token)
  await upsertPrComment({
    body: renderMarkdown(o.findings, o.version),
    logger: o.logger, octokit, owner: o.owner, prNumber: o.prNumber, repo: o.repo,
  })
  const hasBlocking = o.blocking && o.findings.some((f) => f.severity === 'error')
  await publishCheckRun({
    findings: o.findings, hasBlockingFindings: hasBlocking,
    logger: o.logger, octokit, owner: o.owner, repo: o.repo, sha: o.sha,
  })
}
```

> Octokit do `createOctokit(token)` (qua `@actions/github`) dựng **bên trong** analyzer ⇒ worker không phải lo kiểu Octokit khác nhau. Worker chỉ cần đưa **token**.

## Thay đổi 4 — Mở rộng public API (`src/index.ts`)

Thêm các export để web import được:

```ts
export { GitHubChangedFileProvider } from './file-selection/github-changed-file-provider.js'
export { GitHubContentProvider } from './file-selection/github-content-provider.js'
export type { ContentProvider } from './file-selection/content-provider.js'
export { publishPrResults } from './github/publish-results.js'
export type { PublishPrResultsOptions } from './github/publish-results.js'
export { renderMarkdown, MARKER } from './reporters/markdown-reporter.js'
export { defaultConfig } from './config/defaults.js'   // để worker có config mặc định (kiểm tra tên export thực tế)
```

## Thay đổi 5 — Cho web phụ thuộc vào analyzer

- `packages/web/package.json` → thêm dependency workspace:
  ```json
  "github-pr-code-smell-detector": "*"
  ```
- Analyzer phải được **build ra `dist/`** trước khi worker chạy (web import từ `dist`). Đảm bảo `npm run build -w packages/analyzer` chạy trước worker; thêm vào script dev/CI nếu cần.

## Checklist

- [ ] `content-provider.ts` + `fs-content-provider.ts` + `github-content-provider.ts`
- [ ] `analyze()` dùng `contentProvider` (mặc định Fs), test cũ vẫn xanh
- [ ] `publish-results.ts`
- [ ] Bổ sung exports ở `index.ts`
- [ ] web khai báo dependency analyzer + build analyzer trước worker

## Tiêu chí hoàn thành

- [ ] `npm test -w packages/analyzer` vẫn pass (~70 test).
- [ ] Từ một script Node thử: `import { analyze, GitHubChangedFileProvider, GitHubContentProvider, publishPrResults } from 'github-pr-code-smell-detector'` chạy được sau khi build.

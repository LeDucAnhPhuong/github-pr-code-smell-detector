# Trạng Thái Triển Khai — GitHub PR Code Smell Detector

> Cập nhật lần cuối: 2026-06-10  
> Người thực hiện: AI Agent (Claude Sonnet 4.6)

---

> ## ⚠️ CẬP NHẬT 2026-06-19 — File này đã LỖI THỜI ở phần Web
>
> Phần "Epic 5–8 — Web Dashboard ⏳ CHƯA TRIỂN KHAI" bên dưới **không còn đúng**.
> Thực tế `packages/web/` **đã được triển khai đầy đủ** (Next.js 16, 26 màn hình,
> 13 API route, 14 Prisma model, worker BullMQ) và **đã chạy được local end-to-end**.
>
> **Trạng thái hiện tại (đã verify):**
> - Analyzer: `npm run build` ✅, `npm test` ✅ **70 test pass**, lệnh `analyze` chạy thật ✅
> - Web: `docker compose up` (Postgres+Redis) → `db:migrate` + `db:seed` → `npm run dev`
>   phục vụ `/login` (HTTP 200) và redirect auth ✅; `npm run worker` kết nối Redis ✅
>
> 👉 Xem **[HUONG-DAN-CHAY-LOCAL.md](./HUONG-DAN-CHAY-LOCAL.md)** để chạy cả 2 từ đầu,
> và `packages/web/TONG-KET-IMPLEMENTATION.md` để biết chi tiết web.
>
> Các lỗi đã sửa khi verify: node_modules cài lại; 4 lỗi TS ở `mixed-responsibility.ts`;
> `.env` không được Prisma 7 nạp; `seed.ts` thiếu adapter; middleware Edge → `proxy.ts`
> (Node runtime); parse `REDIS_URL` sai (port NaN).

---

## Tổng Quan Cấu Trúc Monorepo

```
github-pr-code-smell-detector/          ← monorepo root
├── package.json                        ✅ workspaces: ["packages/*"]
├── action.yml                          ✅ GitHub Action metadata
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      ✅ CI pipeline
│   │   └── release.yml                 ✅ Release pipeline
│   └── code-smell-detector.yml         ✅ Ví dụ cấu hình mặc định
├── docs/
│   ├── usage.md                        ✅ Hướng dẫn cài đặt & dùng CLI
│   ├── configuration.md                ✅ Tài liệu cấu hình đầy đủ
│   └── rules/react/
│       ├── no-large-component.md       ✅
│       ├── too-many-props.md           ✅
│       ├── too-many-states.md          ✅
│       ├── complex-jsx.md              ✅
│       ├── inline-function-overuse.md  ✅
│       └── mixed-responsibility.md     ✅
└── packages/
    ├── analyzer/                       ✅ CLI & GitHub Action (HOÀN THÀNH)
    └── web/                            ⏳ Placeholder (chưa triển khai)
```

---

## Chi Tiết packages/analyzer

### Trạng Thái Build & Test

| Hạng mục | Kết quả |
|----------|---------|
| `npm run build` (tsc -b) | ✅ 0 lỗi |
| `npm run test` (vitest) | ✅ 67 test, 17 file, 0 thất bại |
| TypeScript strict mode | ✅ Bật |
| ESM module type | ✅ NodeNext |
| Node.js target | ⚠️ Máy local đang dùng v22.16 (yêu cầu >=24) |

---

## Epic 1 — Nền Tảng Monorepo & CLI Core ✅ HOÀN THÀNH

### Đã làm

| File | Mô tả |
|------|-------|
| `src/core/finding.ts` | Interface `Finding`, type `Severity` |
| `src/core/rule.ts` | Interface `Rule`, `RuleContext`, `RuleListeners` |
| `src/core/diagnostic.ts` | Interface `Diagnostic` (kênh riêng, không trộn với Finding) |
| `src/core/logger.ts` | Interface `Logger` + `ConsoleLogger` |
| `src/core/index.ts` | Re-export tất cả contracts |
| `src/analyzer/parser.ts` | Wrapper `@typescript-eslint/typescript-estree` → trả về AST hoặc Diagnostic |
| `src/analyzer/ast/visit.ts` | `visitAST()` — hỗ trợ `NodeType:exit` |
| `src/analyzer/rule-runner.ts` | Chạy rule, cô lập lỗi, `sortFindings()` |
| `src/analyzer/analyzer.ts` | Orchestrator: chọn file → parse → chạy rule → sort → trả kết quả |
| `src/commands/analyze.ts` | Lệnh oclif `code-smell-detector analyze` |
| `bin/run.js` | CLI entry point |

### Chưa làm / Còn thiếu ở Epic 1

| Hạng mục | Ghi chú |
|----------|---------|
| `eslint.config.mjs` đã có nhưng chưa kiểm tra pass | Cần chạy `npm run lint` để xác nhận |
| `bin/run.cmd` | Tồn tại (oclif tạo sẵn) |
| CI test thực tế trên GitHub Actions | Chưa push lên GitHub |

---

## Epic 2 — Phát Hiện Code Smell React/Next.js ✅ HOÀN THÀNH

### 6 Rules đã implement

| Rule ID | Ngưỡng mặc định | File |
|---------|-----------------|------|
| `react/no-large-component` | 150 dòng | `src/rules/react/no-large-component.ts` |
| `react/too-many-props` | 7 props | `src/rules/react/too-many-props.ts` |
| `react/too-many-states` | 5 `useState` | `src/rules/react/too-many-states.ts` |
| `react/complex-jsx` | Độ sâu 5 | `src/rules/react/complex-jsx.ts` |
| `react/inline-function-overuse` | 3 inline fn | `src/rules/react/inline-function-overuse.ts` |
| `react/mixed-responsibility` | (không có ngưỡng) | `src/rules/react/mixed-responsibility.ts` |

### Fixtures & Tests

Mỗi rule đều có:
- `__fixtures__/<rule>/valid/*.tsx` — trường hợp không có lỗi
- `__fixtures__/<rule>/invalid/*.tsx` — trường hợp bị phát hiện lỗi
- `<rule>.test.ts` — test co-located với file nguồn

### Registry

| File | Mô tả |
|------|-------|
| `src/rules/react/index.ts` | Xuất 6 React rules |
| `src/rules/nextjs/index.ts` | Xuất 0 rules (Next.js chưa có rule cụ thể) |
| `src/rules/registry.ts` | `ALL_RULES` — tổng hợp tất cả |

### Chưa làm / Còn thiếu ở Epic 2

| Hạng mục | Ghi chú |
|----------|---------|
| Next.js-specific rules | `nextjs/index.ts` rỗng — post-MVP theo kiến trúc |
| `src/project-detection/detect-react-next.ts` | Đã có nhưng **chưa tích hợp vào analyzer.ts** (chỉ dùng target-filter) |
| File filter không dùng `config.targetPaths` | `target-filter.ts` hardcode paths, không đọc từ config |

---

## Epic 3 — GitHub Action & PR Feedback ✅ HOÀN THÀNH

### Đã làm

| File | Mô tả |
|------|-------|
| `action.yml` | Metadata Action, `runs.using: node20`, `main: packages/analyzer/dist/action.js` |
| `src/action.ts` | Thin wrapper — không có logic phân tích |
| `src/file-selection/github-changed-file-provider.ts` | Octokit `pulls.listFiles` |
| `src/reporters/markdown-reporter.ts` | Comment Markdown có marker `<!-- code-smell-detector -->` |
| `src/github/pr-comment.ts` | Upsert (cập nhật thay vì tạo mới) comment PR |
| `src/reporters/check-annotation-reporter.ts` | `error→failure`, `warning→warning`, `info→notice` |
| `src/github/check-run.ts` | Tạo Check Run, batch annotations (50/lần), fallback khi thiếu quyền |
| `src/github/client.ts` | Tạo Octokit client |
| `tsup.config.ts` | Bundle `src/action.ts → dist/action.js` (single file ESM) |

### Chưa làm / Còn thiếu ở Epic 3

| Hạng mục | Ghi chú |
|----------|---------|
| `dist/action.js` committed | **Chưa build bundle** — cần chạy `npm run build:action` và commit file `dist/action.js` |
| Bundle freshness CI check | CI workflow có bước check nhưng chưa verify hoạt động |
| Test GitHub API calls (mock) | Chưa có unit test cho `pr-comment.ts`, `check-run.ts` (cần mock Octokit) |
| `action.yml` dùng `node20` | Kiến trúc yêu cầu `node24` — GitHub Actions runner chưa hỗ trợ rộng rãi |

---

## Epic 4 — Cấu Hình Rule & Ngưỡng ✅ HOÀN THÀNH

### Đã làm

| File | Mô tả |
|------|-------|
| `src/config/schema.ts` | Zod schema cho `.github/code-smell-detector.yml` |
| `src/config/defaults.ts` | Giá trị mặc định |
| `src/config/load-config.ts` | Parse YAML → validate Zod → fallback defaults → `ConfigError` khi sai |
| `.github/code-smell-detector.yml` | File cấu hình ví dụ đầy đủ |
| `docs/configuration.md` | Tài liệu tất cả các trường cấu hình |
| `docs/usage.md` | Hướng dẫn cài đặt GitHub Action + CLI local |
| `docs/rules/react/*.md` | 6 file tài liệu rule (một file / rule) |

### Chưa làm / Còn thiếu ở Epic 4

| Hạng mục | Ghi chú |
|----------|---------|
| Config `targetPaths` chưa truyền vào `target-filter.ts` | `analyzer.ts` truyền `excludePaths` nhưng không truyền `targetPaths` |
| Test end-to-end với file config thực | Chỉ có unit test, chưa có integration test toàn bộ pipeline |

---

## Epic 5–8 — Web Dashboard ⏳ CHƯA TRIỂN KHAI

Các Epic 5–8 liên quan đến Web Dashboard (`packages/web/`) — **đây là scope riêng, terminal riêng**.

| Epic | Mô tả | Trạng thái |
|------|-------|------------|
| Epic 5 | Next.js App, Auth GitHub OAuth, Dashboard | ❌ Chưa làm |
| Epic 6 | PR Analysis Results, Findings Viewer | ❌ Chưa làm |
| Epic 7 | Repository Config & Rule Management UI | ❌ Chưa làm |
| Epic 8 | Billing, Subscription & Admin | ❌ Chưa làm |

`packages/web/package.json` hiện chỉ là placeholder trống.

---

## Những Việc Cần Làm Ngay (Ưu Tiên Cao)

### 1. Build & Commit Action Bundle

```bash
cd packages/analyzer
npm run build:action
# Sau đó commit dist/action.js vào repo
```

**Lý do:** `action.yml` trỏ đến `packages/analyzer/dist/action.js` — nếu file này chưa tồn tại thì Action không chạy được.

### 2. Sửa targetPaths trong analyzer.ts

Hiện tại `analyzer.ts` chỉ truyền `excludePaths` vào `filterTargetFiles`, không truyền `targetPaths` từ config. Cần cập nhật:

```typescript
// Trong src/analyzer/analyzer.ts
const { included, skippedCount } = filterTargetFiles(changedFiles, {
  excludePaths: config.excludePaths,
  targetPaths: config.targetPaths,  // ← thêm dòng này
})
```

Và cập nhật `target-filter.ts` để nhận và dùng `targetPaths`.

### 3. Khởi tạo Git Repository

```bash
cd github-pr-code-smell-detector
git init
git add .
git commit -m "feat: implement Epics 1-4 (analyzer CLI + GitHub Action)"
```

### 4. Kiểm tra Lint

```bash
cd packages/analyzer
npm run lint
```

---

## Những Việc Cần Làm (Ưu Tiên Trung Bình)

### 5. Test cho github/ modules (mock Octokit)

Cần viết unit test cho:
- `src/github/pr-comment.ts` — mock `octokit.rest.issues.*`
- `src/github/check-run.ts` — mock `octokit.rest.checks.*`

### 6. Test integration toàn bộ pipeline

Test chạy `analyze` lệnh CLI thực sự với một fixture repo nhỏ:
```bash
code-smell-detector analyze --repo ./test-fixture-project
```

### 7. Nâng Node.js engine target thực tế

Máy hiện tại chạy Node v22. `package.json` yêu cầu `>=24`. Nên:
- Giảm về `>=20` (LTS ổn định) trong development
- Hoặc cài Node 24

### 8. action.yml: node20 → node24

Khi GitHub Actions hỗ trợ `node24` runner rộng rãi hơn, cập nhật:
```yaml
runs:
  using: node24   # hiện tại đang dùng node20
```

---

## Những Việc Có Thể Làm Sau (Post-MVP)

| Hạng mục | Ghi chú |
|----------|---------|
| Next.js-specific rules | `nextjs/no-blocking-fetch-in-server-component`, v.v. |
| SARIF reporter | `Finding` model đã SARIF-compatible, chỉ cần thêm reporter |
| Express/Node.js rules | FR17–FR20, deferred theo kiến trúc |
| GitHub Marketplace publishing | Release workflow đã có |
| Web Dashboard (Epic 5–8) | `packages/web/` cần một terminal/session riêng |
| `detect-react-next.ts` tích hợp thực sự | Hiện chỉ có file, chưa được gọi trong analyzer |

---

## Tóm Tắt Nhanh

```
Đã xong:    Epic 1 ✅  Epic 2 ✅  Epic 3 ✅  Epic 4 ✅
Chưa xong:  Epic 5 ❌  Epic 6 ❌  Epic 7 ❌  Epic 8 ❌

Test:  67 passed / 0 failed
Build: tsc -b → 0 errors
CLI:   node bin/run.js --version → OK

Việc quan trọng nhất ngay bây giờ:
  1. npm run build:action  →  commit dist/action.js
  2. git init + git commit
  3. Sửa targetPaths trong analyzer.ts
```

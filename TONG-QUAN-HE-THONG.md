# Tổng Quan Hệ Thống — GitHub PR Code Smell Detector

> Tài liệu này giải thích toàn bộ hệ thống ở mức kiến trúc: có những project nào, mỗi project làm gì, chúng kết nối với nhau ra sao, và dữ liệu chạy qua hệ thống theo luồng nào.
> Đọc xong file này bạn sẽ hiểu được bức tranh lớn mà không cần đọc code.

---

## 1. Hệ thống này để làm gì?

Đây là một công cụ **tự động phát hiện "code smell"** (các đoạn code viết kém chất lượng, khó bảo trì) trong các **Pull Request** của dự án React / Next.js trên GitHub.

Sản phẩm có **hai cách dùng**, phục vụ hai nhóm người:

| Cách dùng | Dành cho ai | Hình dạng |
|---|---|---|
| **Tự động trong CI/CD** | Lập trình viên / team dùng GitHub | Một **GitHub Action / CLI** chạy ngay trong workflow, comment thẳng vào PR |
| **SaaS có dashboard** | Quản lý / team muốn theo dõi tập trung | Một **web app** kết nối repo, lưu lịch sử, thống kê, phân quyền, gói cước |

Cả hai cách dùng **chung một bộ não phân tích** — đó chính là điểm mấu chốt của kiến trúc này.

---

## 2. Cấu trúc tổng thể (Monorepo)

Toàn bộ nằm trong **một monorepo** dùng npm workspaces:

```
github-pr-code-smell-detector/        ← gốc monorepo (npm workspaces)
├── package.json                      ← định nghĩa workspaces + script "dev" chạy cả 2
├── action.yml                        ← khai báo GitHub Action (trỏ vào analyzer)
│
├── packages/
│   ├── analyzer/   ← "BỘ NÃO": CLI + thư viện phân tích code smell
│   └── web/        ← "MẶT TIỀN": Next.js dashboard (SaaS)
│
└── docs/           ← tài liệu rule + cách dùng + cấu hình
```

**Hai project chính:**

1. **`packages/analyzer`** — engine phân tích. Thuần Node.js, không cần database. Là một CLI (oclif) đồng thời export được hàm `analyze()` để project khác gọi.
2. **`packages/dashboard`** — dashboard Next.js 16. Cần PostgreSQL + Redis + GitHub OAuth. Là nơi người dùng đăng nhập, kết nối repo, xem kết quả.

> Lệnh `npm run dev` ở thư mục gốc khởi động đồng thời cả 3 tiến trình: `analyzer` (watch build), `web` (Next.js) và `worker` (hàng đợi xử lý job của web).

---

## 3. Project ANALYZER — bộ não phân tích

**Vị trí:** `packages/analyzer/`
**Bản chất:** CLI viết bằng [oclif](https://oclif.io) (ESM, TypeScript), tên lệnh `code-smell-detector`. Đồng thời là thư viện (export `analyze()` ở `src/index.ts`).
**Phụ thuộc:** chỉ Node.js — **không cần** database hay Redis.

### 3.1 Nhiệm vụ
- Nhận một thư mục code (hoặc danh sách file thay đổi của một PR).
- Phân tích cú pháp (parse) từng file thành **AST** rồi chạy các **rule** để tìm code smell.
- Xuất kết quả ra nhiều định dạng: JSON, Markdown (comment PR), hoặc GitHub Check annotations.
- Khi chạy trong GitHub Action: comment trực tiếp vào PR và set trạng thái check (pass/fail).

### 3.2 Kiến trúc bên trong (`src/`)

| Thư mục | Vai trò |
|---|---|
| `core/` | Hợp đồng dùng chung (single source of truth): `Finding`, `Rule`, `RuleContext`, `Diagnostic`, `Logger` |
| `analyzer/` | Pipeline chính: `parser` (typescript-estree) → `visit` AST (hỗ trợ `:exit`) → `rule-runner` (chạy rule cô lập) → `analyzer` orchestrator |
| `rules/react/` | **6 rule React** đang hoạt động (xem mục 3.3) |
| `rules/nextjs/`, `registry.ts` | Đăng ký rule; chỗ mở rộng cho framework khác |
| `config/` | Đọc file YAML cấu hình bằng `js-yaml` + kiểm tra bằng `zod`, fail-soft nếu lỗi |
| `file-selection/` | Chọn file cần phân tích: toàn bộ, hoặc chỉ file thay đổi (qua Git hoặc GitHub API) |
| `reporters/` | Định dạng output: `json-reporter`, `markdown-reporter` (có marker để upsert), `check-annotation-reporter` |
| `github/` | Nói chuyện với GitHub: `client` (Octokit), `pr-comment` (tạo/cập nhật comment), `check-run` (gửi annotation) |
| `commands/analyze.ts` | Lệnh CLI `analyze` |
| `action.ts` | Lớp mỏng bọc lại để chạy như một GitHub Action |

### 3.3 Sáu rule React đang hoạt động
1. `no-large-component` — component quá dài
2. `too-many-props` — quá nhiều props
3. `too-many-states` — quá nhiều `useState`
4. `complex-jsx` — JSX lồng quá sâu / phức tạp
5. `inline-function-overuse` — lạm dụng hàm inline trong JSX
6. `mixed-responsibility` — một component ôm quá nhiều trách nhiệm

> Ngoài ra có sẵn 3 rule Express + 1 rule JS/TS chung nhưng **chưa bật** (để dành sau MVP).

### 3.4 Nguyên tắc thiết kế (bất biến)
- **Rule là hàm thuần** — không I/O, không `console`, không `throw`. Chỉ được gọi `ctx.report()`.
- Findings luôn sắp xếp theo `(file, line, column, ruleId)` để output ổn định.
- `Diagnostic` (lỗi nội bộ) và `Finding` (code smell) là **hai kênh tách biệt**.
- Comment PR dùng marker `<!-- code-smell-detector -->` để **cập nhật** thay vì tạo comment mới mỗi lần.
- **Exit code:** `0` sạch · `1` có lỗi chặn (blocking) · `2` lỗi nghiêm trọng (fatal).

### 3.5 Cách dùng nhanh
```bash
# Phân tích toàn bộ một thư mục
node bin/run.js analyze --repo <đường-dẫn>

# Chỉ phân tích file thay đổi so với branch base
node bin/run.js analyze --repo . --base-ref main

# Xuất JSON cho CI
node bin/run.js analyze --repo . --format json > findings.json
```

---

## 4. Project WEB — dashboard SaaS

**Vị trí:** `packages/dashboard/`
**Bản chất:** Next.js 16.2.7 (App Router, Turbopack), React 19, TypeScript strict, Tailwind v4.
**Phụ thuộc hạ tầng:** PostgreSQL (qua Prisma 7.8) + Redis (qua BullMQ/ioredis) + GitHub OAuth (Auth.js v5).

### 4.1 Nhiệm vụ
- Cho người dùng **đăng nhập bằng GitHub**, kết nối repository của họ.
- Nhận **webhook** từ GitHub khi có PR mới → xếp job phân tích vào hàng đợi.
- **Worker** xử lý job (gọi engine phân tích), lưu kết quả vào DB.
- Hiển thị kết quả: danh sách findings, chi tiết từng smell, báo cáo, thống kê.
- Quản lý cấu hình rule theo repo, gói cước (billing/quota), tài khoản, và trang admin.

### 4.2 Các khối chính

| Khối | Vị trí | Vai trò |
|---|---|---|
| **Giao diện (Server Components)** | `src/app/(dashboard)/**` | 26 màn hình: dashboard, repo, PR, findings, reports, billing, account |
| **Trang admin** | `src/app/(admin)/admin/**` | Quản lý rule catalog, framework, category, plan — yêu cầu `role === "ADMIN"` |
| **API routes** | `src/app/api/**` | Endpoint cho client + webhook GitHub |
| **Lớp truy cập DB** | `src/lib/db/*` | **Nơi DUY NHẤT** được gọi `prisma.*` |
| **Auth** | `src/lib/auth.ts`, `src/proxy.ts` | GitHub OAuth + bảo vệ route (chạy Node runtime) |
| **Hàng đợi** | `src/lib/queue.ts`, `src/lib/redis.ts` | Đẩy job phân tích vào BullMQ |
| **Worker** | `worker/index.ts`, `worker/processors/` | Tiến trình riêng tiêu thụ job, chạy phân tích |
| **Database schema** | `prisma/schema.prisma` | 14 model nghiệp vụ + các model của Auth.js |

### 4.3 Quy tắc kiến trúc (bất biến)
- **Mọi query của người dùng** phải kèm `userId` trong `where` — và chỉ đi qua helper trong `src/lib/db/*`.
- Cấm gọi `prisma.*` ở ngoài `src/lib/db/`.
- **Server Components** đọc DB trực tiếp; **Client Components** chỉ được gọi `/api/*`.
- API trả về thống nhất: `{ data: T }` khi thành công, `{ error: { code, message } }` khi lỗi.
- Màu mức độ nghiêm trọng (severity) **chỉ** định nghĩa ở `SeverityBadge.tsx`.
- `access_token` của GitHub **không bao giờ** lộ ra trình duyệt.
- Trang chi tiết analysis đang RUNNING thì **poll mỗi 3 giây**, dừng khi COMPLETED/FAILED.

### 4.4 Dữ liệu seed sẵn
- **3 gói cước:** Free (3 repo, 30 phân tích/tháng) · Pro (25 repo, 100/tháng) · Team (100 repo, 1000/tháng).
- **3 framework:** React · Express · JS/TS chung.
- **5 category** và **10 rule** (6 React đang bật).

---

## 5. Hai project KẾT NỐI với nhau như thế nào?

Đây là phần quan trọng nhất. Web **không tự viết lại logic phân tích** — nó tái sử dụng engine của analyzer.

```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub                                │
│   (repo của người dùng + sự kiện Pull Request + webhook)      │
└───────────────┬───────────────────────────┬──────────────────┘
                │                            │
        cách A: CI/CD                cách B: webhook SaaS
                │                            │
                ▼                            ▼
   ┌─────────────────────┐      ┌──────────────────────────────┐
   │   GitHub Action      │      │   WEB (Next.js)              │
   │  (action.yml →       │      │  API /api/webhooks/github    │
   │   analyzer/action.ts)│      │  ① verify chữ ký              │
   │                      │      │  ② kiểm tra quota             │
   │  gọi analyze()       │      │  ③ enqueue job (BullMQ/Redis) │
   │  → comment vào PR     │      │  ④ trả 202 ngay               │
   └──────────┬──────────┘      └───────────────┬──────────────┘
              │                                  │ job
              │                                  ▼
              │                     ┌──────────────────────────┐
              │                     │   WORKER (BullMQ)        │
              │                     │  lấy job khỏi Redis →     │
              │                     │  GỌI analyze() của       │
              │                     │  packages/analyzer →      │
              │                     │  lưu findings vào         │
              │                     │  PostgreSQL (Prisma)      │
              │                     └───────────────┬──────────┘
              │                                     │
              ▼                                     ▼
       Kết quả nằm ngay              Người dùng xem trên DASHBOARD
       trong Pull Request             (findings, reports, thống kê)
```

**Điểm tích hợp cốt lõi:**
- `packages/analyzer` export hàm `analyze()` ở `src/index.ts`.
- `packages/dashboard/worker/processors/analysis.processor.ts` là nơi worker **gọi vào** `analyze()` đó.
- Như vậy: **một bộ rule, hai con đường tiêu thụ** (Action trực tiếp vs. Worker của web).

### 5.1 A và B có chạy cùng lúc trên 1 PR không?

**Mặc định KHÔNG — đây là 2 cách dùng độc lập, người dùng chọn 1 trong 2.** Hai luồng được **kích hoạt bởi 2 cơ chế hoàn toàn khác nhau**, không phụ thuộc nhau:

- **Luồng A** kích hoạt bởi **workflow file** nằm trong chính repo của người dùng (`.github/workflows/...`), chạy trên hạ tầng GitHub Actions — không đụng tới web/DB của chúng ta.
- **Luồng B** kích hoạt bởi **webhook** mà web app đăng ký lên repo, chạy trên server web + worker + database của chúng ta.

| Người dùng cấu hình | Kết quả |
|---|---|
| Chỉ thêm workflow file | Chỉ **Luồng A** chạy → comment trong PR |
| Chỉ kết nối repo qua dashboard | Chỉ **Luồng B** chạy → kết quả trên dashboard |
| Làm **cả hai** | Cả 2 cùng chạy trên 1 PR — không xung đột nhưng **trùng lặp** (phân tích 2 lần, kết quả ở 2 nơi) |

→ Về kỹ thuật cả hai *có thể* cùng chạy, nhưng đó là lãng phí. Thực tế chọn **một**: cần gate nhanh trong CI thì dùng A; cần theo dõi tập trung / lịch sử / thống kê thì dùng B.

> ⚠️ Vì Luồng B hiện chưa hoàn chỉnh (worker còn stub — xem ghi chú dưới), ở trạng thái code hiện tại **chỉ Luồng A thực sự cho ra kết quả**.

> ⚠️ **Trạng thái hiện tại (tham khảo):** processor của worker đang là *stub* — hoàn thành job với 0 findings, **chưa nối thật** vào `analyze()`. Analyzer đã export sẵn API nên đây là bước tích hợp còn lại. (Xem `HUONG-DAN-CHAY-LOCAL.md` mục 6.)

---

## 6. Luồng hoạt động chi tiết (end-to-end)

### Luồng A — Dùng như GitHub Action (CI/CD)
1. Dev mở/cập nhật một Pull Request.
2. GitHub workflow chạy step trỏ tới `action.yml` của repo này.
3. `action.yml` gọi `analyzer/src/action.ts` → bên trong gọi pipeline `analyze()`.
4. Analyzer lấy danh sách **file thay đổi**, parse AST, chạy 6 rule React.
5. Reporter dựng comment Markdown + Check annotations.
6. Module `github/` **comment vào PR** (upsert theo marker) và set trạng thái check.
7. Exit code quyết định PR pass hay bị chặn.

→ *Không cần web, không cần database. Phù hợp team chỉ muốn gate chất lượng trong CI.*

#### Cách cấu hình để có "bot" comment vào PR

Chủ repo cần kiểm tra chỉ phải làm **2 việc**, không cài gì lên máy.

**Bước 1 (bắt buộc) — thêm 1 file workflow vào repo:** `.github/workflows/code-smell-detector.yml`

```yaml
name: Code Smell Detector

on:
  pull_request:
    types: [opened, synchronize, reopened]   # chạy khi mở / push thêm / mở lại PR

permissions:
  contents: read
  pull-requests: write    # ← để bot ghi COMMENT vào PR
  checks: write           # ← để set trạng thái Check (pass/fail)

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Analyze PR for code smells
        uses: leducanhphuongdev/github-pr-code-smell-detector@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Commit & push file này → từ PR tiếp theo bot sẽ tự comment. **Đó là cấu hình tối thiểu.**

**Vì sao đã có "bot" mà không cần tạo tài khoản bot?**
`secrets.GITHUB_TOKEN` là token GitHub **tự cấp sẵn** cho mỗi workflow run; comment hiện dưới danh nghĩa **`github-actions[bot]`**. Hai dòng `permissions` ở trên là thứ cho phép token đó được quyền viết comment và set check — **thiếu 2 dòng này thì bot không comment được.**

**Bước 2 (tùy chọn) — file cấu hình rule:** `.github/code-smell-detector.yml` để chỉnh ngưỡng / tắt bớt rule (chi tiết ở `docs/configuration.md`).

**Các input có thể tinh chỉnh trong `with:`** (theo `action.yml`):

| Input | Mặc định | Tác dụng |
|---|---|---|
| `github-token` | `${{ github.token }}` | Token để comment + set check (**bắt buộc**) |
| `config-path` | `.github/code-smell-detector.yml` | Đường dẫn file cấu hình rule |
| `base-ref` | base của PR | Branch gốc để so sánh file thay đổi |
| `blocking` | `false` | `true` = **chặn PR** (workflow fail, exit 1) khi có finding nghiêm trọng; `false` = chỉ comment, không chặn |

> **Cơ chế 1 comment/PR:** module `github/pr-comment` dùng marker ẩn `<!-- code-smell-detector -->` để **upsert** — lần đầu tạo comment mới, các lần push sau **sửa lại đúng comment cũ** thay vì spam comment mới. Nhờ vậy mỗi PR luôn chỉ có 1 comment của bot, luôn cập nhật.

### Luồng B — Dùng như SaaS qua dashboard
1. Người dùng đăng nhập web bằng **GitHub OAuth**, kết nối repository.
2. Web đăng ký **webhook** lên repo đó.
3. Có PR mới → GitHub bắn webhook tới `POST /api/webhooks/github`.
4. API: **① verify chữ ký** `X-Hub-Signature-256` → **② kiểm tra quota** của user → **③ enqueue** job vào BullMQ (Redis) → **④ trả 202** ngay (không chặn GitHub).
5. **Worker** (tiến trình riêng) nhặt job khỏi Redis → gọi `analyze()` của analyzer → nhận findings.
6. Worker lưu Analysis + Findings + Report vào **PostgreSQL** qua lớp `src/lib/db/*`.
7. Trong lúc chạy, trang chi tiết PR trên dashboard **poll mỗi 3s** để cập nhật trạng thái RUNNING → COMPLETED.
8. Người dùng xem findings, drill-down chi tiết, xem report và thống kê tổng hợp; quản lý cấu hình rule theo repo và theo dõi quota/gói cước.

→ *Phù hợp khi cần lịch sử, thống kê tập trung, phân quyền và tính phí theo dung lượng dùng.*

---

## 7. Công nghệ tóm tắt

| Lớp | Analyzer | Web |
|---|---|---|
| Ngôn ngữ | TypeScript (ESM, NodeNext) | TypeScript (strict) |
| Runtime | Node.js ≥ 24 (22 vẫn chạy) | Node.js ≥ 24 |
| Framework | oclif (CLI) | Next.js 16 (App Router, Turbopack) + React 19 |
| Parse code | `@typescript-eslint/typescript-estree` | — |
| Cấu hình | `js-yaml` + `zod` | `.env` + Prisma config |
| Database | không | PostgreSQL + Prisma 7.8 (`@prisma/adapter-pg`) |
| Hàng đợi | không | BullMQ 5 + ioredis (Redis) |
| Auth | — | Auth.js v5 (`next-auth` beta) + GitHub OAuth |
| GitHub API | Octokit (`@octokit/rest`), `@actions/*` | Octokit |
| UI | — | Tailwind v4 + Radix UI + lucide-react |
| Test | Vitest (~70 test) | Vitest |
| Build | `tsc -b` (+ `tsup` cho action bundle) | `next build` |

---

## 8. Hạ tầng chạy local (tóm tắt)

| Dịch vụ | Cổng | Ghi chú |
|---|---|---|
| Web (Next.js) | 3000 | `npm run dev` |
| PostgreSQL (Docker) | **5433** → 5432 trong container | tránh đụng Postgres native |
| Redis (Docker) | 6379 | cho BullMQ |

Quy trình: `npm install` (gốc) → analyzer `build`/`test` chạy độc lập; web cần `docker compose up -d` → `db:generate` → `db:migrate` → `db:seed` → `npm run dev` + `npm run worker`. Chi tiết đầy đủ ở **`HUONG-DAN-CHAY-LOCAL.md`**.

---

## 9. Bản đồ tài liệu liên quan

| File | Nội dung |
|---|---|
| `TONG-QUAN-HE-THONG.md` | **(File này)** Bức tranh kiến trúc tổng thể |
| `HUONG-DAN-CHAY-LOCAL.md` | Hướng dẫn chạy 2 project ở máy local, port, lỗi đã sửa |
| `TRANG-THAI-TRIEN-KHAI.md` | Trạng thái triển khai từng phần |
| `docs/usage.md` | Cách dùng CLI + cài GitHub Action |
| `docs/configuration.md` | Toàn bộ trường cấu hình `.github/code-smell-detector.yml` |
| `docs/rules/react/*.md` | Tài liệu chi tiết từng rule |
| `packages/dashboard/TONG-KET-IMPLEMENTATION.md` | Chi tiết kiến trúc web: màn hình, API, env, dịch vụ ngoài |

---

## 10. Tóm tắt một câu

> **Analyzer** là bộ não phân tích code smell (chạy được độc lập như CLI/GitHub Action); **Web** là lớp SaaS bọc ngoài để đăng nhập, kết nối repo, xếp hàng job và hiển thị kết quả — cả hai **dùng chung một engine `analyze()`**, khác nhau ở chỗ ai gọi nó: GitHub Action gọi trực tiếp trong CI, còn Web gọi gián tiếp qua Worker + hàng đợi rồi lưu vào database để theo dõi lâu dài.

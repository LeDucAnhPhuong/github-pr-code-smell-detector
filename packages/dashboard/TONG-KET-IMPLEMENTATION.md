# Tổng Kết Triển Khai — Web Dashboard

> **Dự án:** GitHub PR Code Smell Detector — Web Dashboard  
> **Thư mục:** `packages/dashboard/`  
> **Ngày cập nhật:** 2026-06-10  
> **Trạng thái build:** ✅ `npm run build` thành công · ✅ 6/6 test Vitest pass

---

## Mục Lục

1. [Những gì đã implement](#1-những-gì-đã-implement)
2. [Cấu hình còn thiếu (bắt buộc trước khi chạy)](#2-cấu-hình-còn-thiếu-bắt-buộc-trước-khi-chạy)
3. [Dịch vụ ngoài cần setup](#3-dịch-vụ-ngoài-cần-setup)
4. [Lệnh cần chạy một lần](#4-lệnh-cần-chạy-một-lần)
5. [Chức năng còn stub / chưa hoàn chỉnh](#5-chức-năng-còn-stub--chưa-hoàn-chỉnh)
6. [Những gì chưa có (post-MVP)](#6-những-gì-chưa-có-post-mvp)
7. [Quy tắc kiến trúc không được vi phạm](#7-quy-tắc-kiến-trúc-không-được-vi-phạm)

---

## 1. Những gì đã implement

### Stack kỹ thuật
| Thành phần | Phiên bản | Ghi chú |
|---|---|---|
| Next.js | 16.2.7 | App Router, Turbopack |
| React | 19.2.4 | |
| Tailwind CSS | v4 | `@tailwindcss/postcss`, không có `tailwind.config.ts` |
| Prisma | 7.8.0 | Driver adapter pattern (`@prisma/adapter-pg`) |
| Auth.js | v5 (`next-auth@5.0.0-beta.31`) | GitHub OAuth, Prisma adapter |
| BullMQ | ^5 | Queue async analysis job |
| TypeScript | ^5 | Strict mode |

---

### Màn hình (26 screens — tất cả đã tạo file)

#### Epic 5 — Nền tảng & Auth
| File | Màn hình |
|---|---|
| `src/app/(auth)/login/page.tsx` | ✅ Login với GitHub OAuth |
| `src/app/(dashboard)/layout.tsx` | ✅ Shell: Sidebar 248px + TopBar 56px |
| `src/app/(dashboard)/page.tsx` | ✅ Dashboard (metric cards, recent analyses, quota meter) |
| `src/app/(dashboard)/repositories/page.tsx` | ✅ Danh sách repositories |
| `src/components/repositories/ConnectRepoModal.tsx` | ✅ Modal kết nối repo từ GitHub |

#### Epic 6 — PR Analysis & Findings
| File | Màn hình |
|---|---|
| `src/app/(dashboard)/repositories/[repoId]/page.tsx` | ✅ Chi tiết repository |
| `src/app/(dashboard)/repositories/[repoId]/pulls/page.tsx` | ✅ Danh sách Pull Requests |
| `src/app/(dashboard)/repositories/[repoId]/pulls/[prId]/page.tsx` | ✅ Chi tiết phân tích PR (polling 3s) |
| `src/app/(dashboard)/repositories/[repoId]/pulls/[prId]/findings/page.tsx` | ✅ Danh sách Findings |
| `src/app/(dashboard)/repositories/[repoId]/pulls/[prId]/findings/[findingId]/page.tsx` | ✅ Chi tiết Finding + code context |
| `src/app/(dashboard)/repositories/[repoId]/pulls/[prId]/files/page.tsx` | ✅ Changed Files |
| `src/app/(dashboard)/repositories/[repoId]/reports/page.tsx` | ✅ Danh sách Reports |
| `src/app/(dashboard)/repositories/[repoId]/reports/[reportId]/page.tsx` | ✅ Chi tiết Report (Markdown preview) |

#### Epic 7 — Cấu hình Repository
| File | Màn hình |
|---|---|
| `src/app/(dashboard)/repositories/[repoId]/config/page.tsx` | ✅ Cài đặt chung (paths, toggles) |
| `src/app/(dashboard)/repositories/[repoId]/config/rules/page.tsx` | ✅ Rule Settings |
| `src/app/(dashboard)/repositories/[repoId]/config/frameworks/page.tsx` | ✅ Framework Settings |
| `src/app/(dashboard)/repositories/[repoId]/config/categories/page.tsx` | ✅ Category Settings |

#### Epic 8 — Billing & Admin
| File | Màn hình |
|---|---|
| `src/app/(dashboard)/billing/page.tsx` | ✅ Billing Overview + cảnh báo quota |
| `src/app/(dashboard)/billing/plans/page.tsx` | ✅ So sánh gói Free/Pro/Team |
| `src/app/(dashboard)/billing/subscription/page.tsx` | ✅ Chi tiết subscription |
| `src/app/(dashboard)/billing/usage/page.tsx` | ✅ Lịch sử sử dụng |
| `src/app/(dashboard)/account/page.tsx` | ✅ Hồ sơ tài khoản + GitHub permissions |
| `src/app/(admin)/admin/rules/page.tsx` | ✅ Admin: Rule Catalog |
| `src/app/(admin)/admin/frameworks/page.tsx` | ✅ Admin: Framework Catalog |
| `src/app/(admin)/admin/categories/page.tsx` | ✅ Admin: Category Catalog |
| `src/app/(admin)/admin/plans/page.tsx` | ✅ Admin: Subscription Plan Management |

---

### API Routes
| Endpoint | Phương thức | Mô tả |
|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | Auth.js GitHub OAuth handler |
| `/api/webhooks/github` | POST | Nhận GitHub PR webhook → BullMQ |
| `/api/repositories` | GET/POST | Lấy/tạo repository |
| `/api/repositories/[repoId]` | GET/DELETE | Chi tiết/xóa repository |
| `/api/repositories/[repoId]/config` | GET/PUT | Đọc/lưu cấu hình repo |
| `/api/repositories/[repoId]/sync` | POST | Sync PRs từ GitHub API |
| `/api/repositories/[repoId]/analyses` | POST | Trigger phân tích lại |
| `/api/repositories/github-search` | GET | Tìm repos GitHub của user |
| `/api/analyses/[analysisId]/status` | GET | Polling status (dùng mỗi 3s) |
| `/api/admin/rules` | GET/POST/PATCH | CRUD rules (Admin only) |
| `/api/admin/frameworks` | GET/PATCH | Quản lý frameworks (Admin only) |
| `/api/admin/categories` | GET/PATCH | Quản lý categories (Admin only) |
| `/api/admin/plans` | GET/PATCH | Quản lý plans (Admin only) |

---

### Prisma Schema — 14 model (13 domain + 1 Auth)
```
User, Account, Session, VerificationToken  ← Auth.js required
Repository, PullRequest, PrAnalysis        ← Core domain
ChangedFile, Finding                       ← Analysis results
Rule, Category, Framework                  ← Catalog (admin-managed)
EvaluationResult, AnalysisReport           ← Output
TenantSubscription, SubscriptionPlan       ← Billing
SubscriptionUsage                          ← Quota tracking
```

### Library helpers (`src/lib/db/`)
- `repositories.ts` — getRepositories, createRepository, updateRepositoryConfig
- `analyses.ts` — getDashboardStats, getRecentAnalyses, getAnalysisStatus, updateAnalysisStatus
- `findings.ts` — getFindings, getFinding, getHighSeverityFindings
- `reports.ts` — getReports, getReport
- `billing.ts` — getSubscription, checkQuota, incrementUsage, getAllPlans
- `admin.ts` — CRUD cho Rules/Frameworks/Categories/Plans

### Components
- `SeverityBadge.tsx` — **Nguồn màu severity duy nhất** (High=#FFEBE9/#CF222E, Medium=#FFF8C5/#9A6700, Low=#DDF4FF/#0969DA)
- `AnalysisStatus.tsx` — Badge + polling hook 3s
- `Sidebar.tsx` — 248px, collapse to icon-only
- `TopBar.tsx` — 56px, avatar + sign out
- `Breadcrumb.tsx`, `ConnectRepoModal.tsx`, `RepoConfigForm.tsx`

### Worker (`worker/`)
- `worker/index.ts` — BullMQ Worker kết nối Redis, lắng nghe queue "analysis"
- `worker/processors/analysis.processor.ts` — Xử lý job, cập nhật DB, tính usage

---

## 2. Cấu hình còn thiếu (bắt buộc trước khi chạy)

Tạo file `.env` trong `packages/dashboard/` từ `.env.example`:

```bash
cp packages/dashboard/.env.example packages/dashboard/.env
```

Sau đó điền đầy đủ các giá trị:

| Biến môi trường | Bắt buộc | Lấy từ đâu | Mô tả |
|---|---|---|---|
| `AUTH_GITHUB_ID` | ✅ **Bắt buộc** | GitHub OAuth App | Client ID của GitHub OAuth App |
| `AUTH_GITHUB_SECRET` | ✅ **Bắt buộc** | GitHub OAuth App | Client Secret của GitHub OAuth App |
| `DATABASE_URL` | ✅ **Bắt buộc** | PostgreSQL provider | Connection string PostgreSQL |
| `REDIS_URL` | ✅ **Bắt buộc** | Redis provider | Connection string Redis (cho BullMQ) |
| `GITHUB_WEBHOOK_SECRET` | ✅ **Bắt buộc** | Tự tạo | Chuỗi bí mật để verify webhook signature |
| `NEXTAUTH_SECRET` | ✅ **Bắt buộc** | Tự tạo | Secret để ký session token Auth.js |

### Cách tạo `NEXTAUTH_SECRET`
```bash
openssl rand -base64 32
```

### Cách tạo `GITHUB_WEBHOOK_SECRET`
```bash
openssl rand -hex 32
```

---

## 3. Dịch vụ ngoài cần setup

### 3.1 GitHub OAuth Application
1. Vào [github.com/settings/developers](https://github.com/settings/developers) → **OAuth Apps** → **New OAuth App**
2. Điền:
   - **Application name:** `GitHub PR Code Smell Detector`
   - **Homepage URL:** `http://localhost:3000` (dev) hoặc URL production
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy **Client ID** → `AUTH_GITHUB_ID`
4. Generate **Client Secret** → `AUTH_GITHUB_SECRET`

> ⚠️ Khi deploy production, cần tạo OAuth App riêng với callback URL production.

---

### 3.2 PostgreSQL — Cơ sở dữ liệu
Cần PostgreSQL 17. Các lựa chọn:

| Option | Miễn phí | Cách lấy URL |
|---|---|---|
| **Supabase** (khuyến nghị) | ✅ Free tier | Dashboard → Project Settings → Database → Connection string |
| **Railway** | Có free tier | Dashboard → PostgreSQL service → Connect → Database URL |
| **Neon** | ✅ Free tier | Dashboard → Connection Details |
| Local (Docker) | ✅ | `postgresql://postgres:password@localhost:5432/codeSmellDb` |

**Ví dụ URL:**
```
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
```

---

### 3.3 Redis — Hàng đợi BullMQ
Cần Redis cho BullMQ job queue.

| Option | Miễn phí | Cách lấy URL |
|---|---|---|
| **Redis Cloud** (khuyến nghị) | ✅ Free 30MB | Dashboard → Database → Connect → Redis URL |
| **Railway Redis** | Có free tier | Dashboard → Redis service → Connect |
| Local (Docker) | ✅ | `redis://localhost:6379` |

**Ví dụ URL:**
```
REDIS_URL=redis://default:password@redis-host:6379
```

---

### 3.4 GitHub Webhook
Sau khi deploy (hoặc dùng `ngrok` để test local):

1. Vào repo GitHub → **Settings** → **Webhooks** → **Add webhook**
2. Điền:
   - **Payload URL:** `https://your-domain.com/api/webhooks/github`
   - **Content type:** `application/json`
   - **Secret:** giá trị của `GITHUB_WEBHOOK_SECRET`
   - **Events:** chọn **Pull requests**

> 💡 Dùng `ngrok http 3000` khi test local để có public URL.

---

## 4. Lệnh cần chạy một lần

Sau khi điền `.env`, chạy theo thứ tự:

```bash
# Bước 1: Cài dependencies (nếu chưa có)
cd packages/dashboard
npm install

# Bước 2: Generate Prisma client
npm run db:generate

# Bước 3: Chạy migration tạo bảng
# ⚠️ Cần DATABASE_URL hợp lệ trỏ tới PostgreSQL thật
npm run db:migrate
# Đặt tên migration: "init"

# Bước 4: Seed dữ liệu mặc định (3 plans + rules + frameworks + categories)
npm run db:seed

# Bước 5: Khởi động dev server
npm run dev
# App chạy tại http://localhost:3000
```

---

## 5. Chức năng còn stub / chưa hoàn chỉnh

Các phần đã có UI và API nhưng logic lõi chưa kết nối hoàn toàn:

| Chức năng | File | Trạng thái | Cần làm thêm |
|---|---|---|---|
| **Worker phân tích** | `worker/processors/analysis.processor.ts` | ⚠️ Stub | Kết nối `packages/analyzer` khi nó export programmatic API. Hiện tại hoàn thành phân tích với 0 findings |
| **Code context** | Finding Detail page | ⚠️ Placeholder | Gọi GitHub API (Octokit) lấy nội dung file thật tại `commitSha` |
| **GitHub Search** | `ConnectRepoModal.tsx` | ✅ Hoạt động | Cần token GitHub có quyền `repo` |
| **Re-run analysis** | PR Analysis Detail | ⚠️ UI có, API có | Cần nút "Re-run" gọi `POST /api/repositories/[repoId]/analyses` |
| **Sync Pull Requests** | Repository Detail | ⚠️ API có | Cần nút "Sync PRs" gọi `POST /api/repositories/[repoId]/sync` |
| **Cancel subscription** | Billing/Subscription | ⚠️ UI button | Chưa có API endpoint xử lý hủy subscription |
| **Admin set user plan** | Admin Plans page | ⚠️ Xem được | Chưa có UI để admin gán plan cho user cụ thể |
| **Upgrade request** | Billing Plans page | ⚠️ Button có | Chưa gửi email/notification cho admin |

---

## 6. Những gì chưa có (post-MVP)

Theo kiến trúc, các tính năng này được hoãn đến sau MVP:

| Tính năng | Lý do hoãn |
|---|---|
| **Stripe payment** | Billing hiện tại là admin-set thủ công |
| **SSE/WebSocket** | Polling 3s đủ cho MVP |
| **GitHub App** | Hiện dùng webhook cài tay từng repo |
| **Multi-org tenancy** | Row-level user tenancy đủ cho MVP |
| **E2E tests (Playwright)** | Framework có sẵn, chưa viết test case |
| **Express rules** | 3 Express rules đã seed nhưng `isActive: false` |
| **Rule detail drawer** | Admin edit rule (UI drawer chưa implement) |
| **Plan upgrade workflow** | Cần email/notification pipeline |
| **YAML preview** | Config page có nav item nhưng chưa có page |
| **Evaluation tab detail** | Tab Evaluation trỏ về Findings (chưa có EvaluationResult UI riêng) |

---

## 7. Quy tắc kiến trúc không được vi phạm

Những quy tắc này **bắt buộc** trong mọi code thêm vào sau này:

```
✅ Mọi query DB scoped by userId phải qua src/lib/db/* helpers
✅ Cấm gọi prisma.* trực tiếp trong page/component files
✅ Server Component: đọc DB trực tiếp, KHÔNG fetch('/api/...')
✅ Client Component: chỉ gọi /api/*, KHÔNG import từ src/lib/db/
✅ API Route: trả { data: T } khi thành công, { error: { code, message } } khi lỗi
✅ SeverityBadge.tsx là nơi DUY NHẤT định nghĩa màu severity
✅ Webhook handler: verify signature → quota check → enqueue → 202 ngay
✅ Analysis polling: 3s khi RUNNING, dừng khi COMPLETED/FAILED
✅ access_token KHÔNG bao giờ expose cho browser/client components
✅ Admin routes (/admin/*, /api/admin/*): từ chối non-ADMIN với 403
```

---

## Cấu trúc thư mục tóm tắt

```
packages/dashboard/
├── .env.example              ← Copy thành .env và điền giá trị
├── prisma.config.ts          ← Prisma 7 config (datasource URL)
├── prisma/
│   ├── schema.prisma         ← 14 models đầy đủ
│   └── seed.ts               ← Seed plans, frameworks, categories, rules
├── src/
│   ├── app/
│   │   ├── (auth)/login/     ← Login page
│   │   ├── (dashboard)/      ← 20+ trang authenticated
│   │   ├── (admin)/admin/    ← 4 trang admin (role guard)
│   │   └── api/              ← 13 API route handlers
│   ├── components/           ← UI components
│   ├── lib/
│   │   ├── prisma.ts         ← Singleton PrismaClient
│   │   ├── auth.ts           ← Auth.js config
│   │   ├── github.ts         ← Octokit helpers (server only)
│   │   ├── queue.ts          ← BullMQ queue
│   │   └── db/               ← Query helpers (nguồn duy nhất gọi prisma.*)
│   ├── middleware.ts          ← Session guard + admin role guard
│   └── types/index.ts        ← Shared types
├── worker/
│   ├── index.ts              ← BullMQ Worker (chạy tách biệt)
│   └── processors/
│       └── analysis.processor.ts  ← Stub — cần kết nối analyzer
└── tests/unit/
    └── severity-badge.test.tsx    ← 6 tests passing
```

---

*File này được tạo tự động ngày 2026-06-10 sau khi hoàn thành triển khai Epic 5–8.*

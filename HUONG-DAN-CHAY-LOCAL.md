# Hướng Dẫn Chạy Local — GitHub PR Code Smell Detector

> Cập nhật: 2026-06-19 · Đã verify chạy được trên Windows 11 + Node v22.16 + Docker Desktop.

Monorepo gồm 2 phần chạy độc lập:

| Package | Là gì | Cần gì để chạy |
|---|---|---|
| `packages/analyzer` | CLI + GitHub Action phân tích code smell | Chỉ Node.js |
| `packages/dashboard` | Web dashboard (Next.js 16, cổng 3000) | Node.js + PostgreSQL + Redis + GitHub OAuth |
| `packages/landing` | Landing marketing (Next.js 16, cổng 3001) | Chỉ Node.js (static) |

---

## 0. Yêu cầu môi trường

| Công cụ | Phiên bản | Ghi chú |
|---|---|---|
| Node.js | **≥ 24** khuyến nghị (22 vẫn chạy được) | `package.json` khai báo `engines >=24`; CI dùng Node 24. Máy đang test dùng 22.16 OK. |
| npm | 10+ | Đi kèm Node |
| Docker Desktop | bất kỳ bản mới | Chỉ cần cho **web** (Postgres + Redis). Analyzer không cần. |

---

## 1. Cài dependencies (làm một lần, cho cả monorepo)

Đây là **bước bắt buộc đầu tiên** — repo này từng bị `node_modules` cài dở dang khiến cả 2 package không chạy.

```bash
cd github-pr-code-smell-detector
npm install        # workspaces: cài cho cả analyzer + web
```

---

## 2. Chạy ANALYZER (CLI)

```bash
cd packages/analyzer

npm run build      # tsc -b → dist/
npm test           # vitest → 70 test pass
```

Chạy thử phân tích một thư mục:

```bash
# Phân tích toàn bộ file trong một repo
node bin/run.js analyze --repo <đường-dẫn-project>

# Ví dụ chạy trên fixtures có sẵn để thấy findings
node bin/run.js analyze --repo src/rules/react/__fixtures__

# So với một base branch (chỉ phân tích file thay đổi)
node bin/run.js analyze --repo <project> --base-ref main

# Output JSON cho CI
node bin/run.js analyze --repo . --format json > findings.json
```

Các cờ: `--repo` (mặc định `.`), `--config` (mặc định `.github/code-smell-detector.yml`), `--base-ref`, `--format json`.
Xem thêm `docs/usage.md` và `docs/configuration.md`.

Build bundle cho GitHub Action (single file `dist/action.js`):

```bash
npm run build:action
```

---

## 3. Chạy WEB (dashboard)

### 3.1 Khởi động Postgres + Redis bằng Docker

File `packages/dashboard/docker-compose.yml` đã có sẵn. Postgres ánh xạ ra **host port 5433** (để không đụng Postgres native trên 5432 nếu có), Redis ở **6379**.

```bash
cd packages/dashboard
docker compose up -d           # tạo & chạy 2 container
docker compose ps              # kiểm tra: cả 2 phải "healthy"
```

Dừng / xoá dữ liệu:

```bash
docker compose down            # dừng, giữ data
docker compose down -v         # dừng + xoá sạch volume
```

### 3.2 File `.env`

File `packages/dashboard/.env` đã được tạo sẵn cho môi trường Docker ở trên (DATABASE_URL trỏ tới `localhost:5433`, REDIS_URL tới `localhost:6379`, đã sinh sẵn `NEXTAUTH_SECRET` và `GITHUB_WEBHOOK_SECRET`).

**Chỉ còn thiếu GitHub OAuth** (bắt buộc nếu muốn đăng nhập — không thể tự động hoá):

1. Vào https://github.com/settings/developers → **OAuth Apps** → **New OAuth App**
2. Điền:
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Copy **Client ID** và **Client Secret** vào `.env`:
   ```
   AUTH_GITHUB_ID="..."
   AUTH_GITHUB_SECRET="..."
   ```

### 3.3 Khởi tạo database

```bash
cd packages/dashboard
npm run db:generate            # sinh Prisma Client
npm run db:migrate             # tạo bảng (lần đầu đặt tên migration: "init")
npm run db:seed                # seed plans + rules + frameworks + categories
```

> Các script này tự nạp `.env` qua `dotenv` (đã wire trong `prisma.config.ts` và `seed.ts`).

### 3.4 Chạy app + worker

**Cách nhanh nhất — một lệnh ở ROOT chạy cả 2 project cùng lúc** (analyzer watch + web + worker, gộp log theo màu):

```bash
cd github-pr-code-smell-detector     # thư mục gốc monorepo
npm run dev
```

> Pane: `[analyzer]` tsc watch · `[web]` Next.js · `[worker]` BullMQ. Nhấn `Ctrl+C` tắt cả 3.
> Cần Docker (mục 3.1) đã chạy trước. Muốn bỏ worker, dùng `npm run dev:apps` (chỉ analyzer + web).

Hoặc chạy thủ công từng phần trong `packages/dashboard` (2 terminal):

```bash
npm run dev                    # http://localhost:3000
npm run worker                 # worker xử lý job (BullMQ)
```

Mở http://localhost:3000 → bị redirect sang `/login`. Bấm **Sign in with GitHub** (cần đã điền OAuth ở 3.2).

Công cụ phụ:

```bash
npm run db:studio              # Prisma Studio xem/sửa DB
```

---

## 3b. Chạy LANDING (trang marketing)

Landing là Next.js tĩnh, không cần DB/Redis. Chạy ở **cổng 3001** (độc lập dashboard):

```bash
cd github-pr-code-smell-detector
npm run dev:landing            # http://localhost:3001
```

Nút "Get started" / "Sign in" trỏ về dashboard qua `NEXT_PUBLIC_DASHBOARD_URL`
(mặc định `http://localhost:3000`). Xem `packages/landing/.env.example`.

---

## 4. Tóm tắt cổng (port)

| Dịch vụ | Cổng | Nguồn |
|---|---|---|
| Dashboard (Next.js) | 3000 | `npm run dev:dashboard` |
| Landing (Next.js) | 3001 | `npm run dev:landing` |
| PostgreSQL (Docker) | **5433** → 5432 trong container | `docker-compose.yml` |
| Redis (Docker) | 6379 | `docker-compose.yml` |

> Nếu cổng đang bận, Next sẽ tự nhảy cổng khác và in URL trong log.

---

## 5. Những lỗi đã sửa để chạy được (tham khảo)

Khi verify, các vấn đề sau đã được khắc phục:

| Vấn đề | Vị trí | Cách sửa |
|---|---|---|
| `node_modules` cài dở (thiếu `minimist`, `debug`, `typescript`) | toàn monorepo | Chạy lại `npm install` ở root |
| 4 lỗi TypeScript chặn build (`Object is possibly undefined`) | `analyzer/src/rules/react/mixed-responsibility.ts` | Thêm non-null assertion `!` sau `scopeStack.at(-1)` (đã có guard `length > 0`) |
| Prisma CLI không nạp `.env` (Prisma 7) | `web/prisma.config.ts`, `web/prisma/seed.ts` | Thêm `import "dotenv/config"` |
| `seed.ts` tạo `new PrismaClient()` thiếu adapter | `web/prisma/seed.ts` | Dùng `PrismaPg` adapter |
| Middleware chạy Edge runtime → Prisma/pg lỗi `node:util/types` | `web/src/middleware.ts` | Next 16 đổi sang **`proxy.ts`** (chạy Node runtime mặc định) |
| Parse `REDIS_URL` sai (port = NaN khi URL không có `user@`) | `web/src/lib/queue.ts`, `web/worker/index.ts` | Parse bằng `new URL()` qua helper `src/lib/redis.ts` |

---

## 6. Phần còn stub (chưa hoàn chỉnh — không chặn việc chạy local)

- **Worker phân tích** (`worker/processors/analysis.processor.ts`): hiện hoàn thành job với 0 findings. Cần nối với `packages/analyzer` khi analyzer export API lập trình được (analyzer **đã** export `analyze()` ở `src/index.ts` — có thể tích hợp).
- **Code context** ở trang Finding Detail: placeholder, cần gọi GitHub API lấy nội dung file thật.
- Một số nút (Re-run, Sync PRs, Cancel subscription...) — xem chi tiết ở `packages/dashboard/TONG-KET-IMPLEMENTATION.md` mục 5.
- **GitHub Webhook** chỉ cần khi test luồng PR thật → dùng `ngrok http 3000` để có public URL.

---

## 7. Tài liệu liên quan

| File | Nội dung |
|---|---|
| `docs/usage.md` | Dùng CLI + cài GitHub Action |
| `docs/configuration.md` | Toàn bộ trường cấu hình `.github/code-smell-detector.yml` |
| `docs/rules/react/*.md` | Tài liệu từng rule |
| `packages/dashboard/TONG-KET-IMPLEMENTATION.md` | Chi tiết kiến trúc web, màn hình, API, env, dịch vụ ngoài |
| `TRANG-THAI-TRIEN-KHAI.md` | Trạng thái triển khai (xem ghi chú cập nhật ở đầu file) |

# Phase B — Scaffold `packages/admin` (Next.js) + UI base theo shadcn-admin

> Tiền đề: Phase A xong, dashboard đã verify không hỏng.

## Mục tiêu
Dựng app admin độc lập (Next.js, cổng 3002), import `@core`, **cài shadcn/ui + override font/màu theo dashboard**, dựng **bố cục UI tương tự shadcn-admin**, **guard ADMIN**, và **gỡ admin khỏi dashboard**.

## B1. Scaffold Next.js app
```
packages/admin/
  package.json    name: "@github-pr-code-smell-detector/admin", "dev": "next dev -p 3002"
  next.config.ts  output standalone, transpilePackages: ["...core"], serverExternalPackages: ["@prisma/adapter-pg","pg"]
  tsconfig.json   paths { "@/*": ["./src/*"] }
  postcss.config  + Tailwind v4
  components.json (shadcn/ui config)
  .env.example    DATABASE_URL, AUTH_SECRET (GIỐNG dashboard), AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, DASHBOARD_URL=http://localhost:3000
  public/         logo tối thiểu
  src/
    app/ layout.tsx, globals.css, page.tsx (placeholder), (các trang ở phase sau)
    proxy.ts
    components/ (layout + ui shadcn)
    lib/ auth.ts (re-export core), utils.ts (cn)
```
- [ ] Thêm dep `"@github-pr-code-smell-detector/core": "*"` + react/next như dashboard.
- [ ] Root `package.json`: thêm `"dev:admin": "next dev -w packages/admin"` và đưa admin vào script `dev` tổng (concurrently).

## B2. Cài shadcn/ui + Tailwind v4
- [ ] Khởi tạo shadcn/ui (`components.json`, `lib/utils.ts` với `cn`), Tailwind v4.
- [ ] Thêm các component shadcn cần: `button, input, label, textarea, select, dialog, sheet, dropdown-menu, table, badge, switch, card, sidebar, command, sonner (toast), form, tabs, tooltip, avatar, separator, scroll-area, checkbox`.
- [ ] Thêm lib: `@tanstack/react-table`, `cmdk`, `sonner`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`.

## B3. Design system — override font + màu theo dashboard (KHÔNG chọn mới)
- [ ] Trong `admin/src/app/globals.css`: dùng theme shadcn (biến `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`...).
- [ ] **Gán giá trị màu** các biến trên = giá trị **color tokens của dashboard** (lấy từ `packages/dashboard/src/app/globals.css`, palette Mono-ink). Làm cả `:root` (light) và `.dark`.
- [ ] **Font**: set `font-family` giống dashboard (họ Geist). Nếu dashboard dùng `next/font`, cấu hình tương tự trong `admin/src/app/layout.tsx`.
- [ ] Giữ nguyên radius/shadow/spacing/biến thể của shadcn (không lấy từ dashboard).

## B4. Bố cục UI (tham khảo shadcn-admin)
- [ ] `components/layout/`: `AppSidebar` (thu gọn được, nav: Overview / Categories / Frameworks / Plans / Users — **không có Rules**), `Header` (breadcrumb + user menu + theme toggle), `CommandMenu` (⌘K).
- [ ] `app/layout.tsx`: bọc `SidebarProvider` + `Header`, `<Toaster/>` (sonner), theme provider (dark/light).
- [ ] `app/page.tsx`: placeholder (Phase F sẽ thay bằng thống kê).

## B5. Auth / guard (dùng chung session, không Clerk)
- [ ] `admin/src/lib/auth.ts` → re-export `auth` từ core.
- [ ] `admin/src/proxy.ts`: `export default auth((req) => {...})`:
  - nếu `!isLoggedIn || role !== "ADMIN"`: route `/api/*` → `403 { error:{ code:"FORBIDDEN" } }`; còn lại → `redirect(\`${DASHBOARD_URL}/login?callbackUrl=...\`)`.
  - `matcher` loại trừ `_next/static`, ảnh...
- [ ] Layout/trang vẫn gọi `auth()` để double-check (defense-in-depth).
- [ ] Không mount `/api/auth` ở admin → không cần thêm callback URL ở GitHub App. (Auth config vẫn cần `AUTH_GITHUB_ID/SECRET` để khởi tạo — đặt cùng giá trị dashboard.)

## B6. Gỡ admin khỏi dashboard
- [ ] Xóa `dashboard/src/app/(admin)/` và `dashboard/src/app/api/admin/`.
- [ ] `dashboard/src/proxy.ts`: bỏ nhánh xử lý `/admin` & `/api/admin`.
- [ ] `dashboard/src/components/layout/Sidebar.tsx`: bỏ `adminGroup`/`isAdmin` (hoặc đổi thành link ngoài tới admin app cho user ADMIN).

## Tiêu chí hoàn thành (DoD)
- `npm run dev:admin` mở `localhost:3002`, layout shadcn hiển thị (sidebar + header + ⌘K), màu/font khớp dashboard.
- Chưa login → bị đẩy sang `localhost:3000/login`. Login user không ADMIN → bị chặn. Login ADMIN → vào được.
- Dashboard vẫn chạy bình thường sau khi gỡ admin.

## Verify
```
npm run dev:dashboard   # đăng nhập 1 lần
npm run dev:admin       # mở 3002, kiểm tra guard + layout + theme
npm run typecheck -w packages/admin
```

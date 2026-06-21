# Tổng quan — Tách Admin thành package riêng + dựng lại UI theo shadcn-admin

> Bộ tài liệu này chia nhỏ `KE-HOACH-ADMIN-PACKAGE.md` thành từng phase để dễ implement.
> File này là **tổng thể**; mỗi phase có file riêng (01 → 06).
> Cập nhật: 2026-06-21

---

## 1. Mục tiêu

Chuyển admin từ chỗ **nằm lẫn trong app `dashboard`** (`src/app/(admin)`, `api/admin`, `lib/db/admin.ts`) thành **một project độc lập `packages/admin`** trong monorepo, **dựng lại UI** theo mẫu [satnaing/shadcn-admin](https://github.com/satnaing/shadcn-admin), và **hoàn thiện CRUD** (Category / Framework / Plan + quản lý User + thống kê).

> ⚠️ **Tạm bỏ CRUD Rule ở admin.** Việc thêm/sửa rule dự kiến sẽ do **user tự làm phía họ** (tương lai), nên trong phạm vi hiện tại admin **không** quản lý rule. Vẫn giữ Category/Framework (kèm số rule chỉ để hiển thị tham chiếu).

## 2. Quyết định kiến trúc (đã chốt)

1. **`packages/core` dùng chung**: Prisma (schema + client), Auth.js config, types, db helpers. Cả `dashboard` và `admin` import từ core.
2. **Dùng chung session DB**: admin cùng `DATABASE_URL` + cùng `AUTH_SECRET` + cùng cookie. Auth.js dùng `session.strategy = "database"` → admin tra cùng bảng `Session`. Local: cookie chia sẻ giữa các port của `localhost` → login 1 lần ở dashboard là vào được admin. Admin **không tự login** — chưa đăng nhập / không phải ADMIN thì redirect sang login của dashboard.
3. **Admin là Next.js app** (cổng **3002**), giữ kiến trúc server-side để tận dụng core (Prisma + `auth()`).
4. **Phạm vi**: tách package **+ làm luôn CRUD F1–F6**.

## 3. UI & Design System

### 3.1. Cách dùng template shadcn-admin
- Template gốc là **Vite + TanStack Router + shadcn/ui + Clerk**. Ta **KHÔNG fork** khung Vite/router/Clerk.
- Dùng shadcn-admin **làm MẪU tham khảo** (look & feel, bố cục, cách tổ chức component) để **dựng lại UI tương tự** bằng **shadcn/ui trong Next.js App Router** của admin.
- Bố cục mong muốn (giống shadcn-admin): app **sidebar thu gọn được** (nav: Overview / Categories / Frameworks / Plans / Users), **header** có breadcrumb + user menu, **command palette ⌘K**, **data-table** (TanStack Table) có sort/filter/pagination, **dialog/sheet** cho form, **toast** (sonner), **dark/light mode**.

### 3.2. Design system: lấy gì từ shadcn, giữ gì từ dashboard
- **Lấy từ shadcn/ui (theo template):** cấu trúc component, radius, spacing, shadow, biến thể nút/badge, dark mode, data-table, dialog/sheet, dropdown, command menu.
- **GIỮ từ dashboard (KHÔNG chọn mới):** **font** và **màu (color tokens)** — đã định nghĩa ở `packages/dashboard/src/app/globals.css` (palette **Mono-ink** + font họ **Geist**).
  - Khi cài shadcn/ui: **override** các biến màu của shadcn (`--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--border`, `--input`, `--ring`, ...) bằng giá trị màu của dashboard; set `font-family` giống dashboard.
  - Mọi thứ design-system khác (radius/shadow/spacing/biến thể) theo mặc định shadcn/ui như template.

### 3.3. Thư viện thêm cho admin
- `@tanstack/react-table` (đã dùng ở dashboard), `lucide-react`, `cmdk` (command menu), `sonner` (toast), `react-hook-form` + `zod` (+ `@hookform/resolvers`), các Radix primitives do shadcn/ui CLI thêm, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss-animate`/preset Tailwind v4.
- Auth: **không Clerk** — dùng `auth()` của core + guard ở `proxy.ts`.

## 4. Cấu trúc monorepo sau khi tách

```
packages/
  core/        MỚI: prisma (schema+client), auth, types, db helpers
  dashboard/   import @core (giữ nguyên hành vi, dùng shim re-export)
  admin/       MỚI: Next.js app cổng 3002, shadcn/ui (mẫu shadcn-admin), import @core
  analyzer/    (không đổi)
  landing/     (không đổi)
```

## 5. Nguyên tắc giảm rủi ro
54 file dashboard import `@/lib/prisma|auth`, `@/types`, `@/lib/db/*` (106 lần). Để **không sửa 54 file**, dùng **shim re-export**: giữ file cũ trong dashboard, nội dung chỉ là `export * from "@github-pr-code-smell-detector/core/..."`.

## 6. Danh sách Phase

| Phase | File | Nội dung |
|---|---|---|
| A | `01-phase-a-core.md` | Tách `packages/core` (Prisma + Auth + types + db). Verify dashboard không hỏng. |
| B | `02-phase-b-admin-scaffold-ui.md` | Scaffold `packages/admin` (Next.js), cài shadcn/ui + override font/màu theo dashboard, bố cục theo shadcn-admin, guard ADMIN, gỡ admin khỏi dashboard. |
| C | `03-phase-c-backend-crud.md` | Mở rộng `core/db` (create/delete + users + stats) và API routes admin. (Không có rule.) |
| D | `04-phase-d-ui-catalog.md` | UI CRUD catalog (Category/Framework/Plan) bằng shadcn data-table + dialog form. (Không có rule.) |
| E | `05-phase-e-users.md` | Quản lý User (F5). |
| F | `06-phase-f-stats.md` | Dashboard thống kê admin (F6). |

## 7. Thứ tự thực thi

```
A (core) ─► verify dashboard ─► B (scaffold admin + UI base + gỡ admin khỏi dashboard)
  ─► C (backend CRUD + API) ─► D (UI catalog) ─► E (users) ─► F (stats) ─► verify toàn bộ
```

## 8. Verification tổng (chi tiết ở từng phase)
1. `packages/core`: `db:generate` + `db:migrate` + `db:seed` OK.
2. Dashboard chạy như cũ (`dev:dashboard` + `dev:worker`), `typecheck`/`build` pass.
3. Admin (`dev:admin`, cổng 3002): chưa login → đẩy sang dashboard login; user không ADMIN → bị chặn; user ADMIN → vào được.
4. CRUD đủ create/edit/toggle/delete cho 3 catalog (Category/Framework/Plan); quản lý user đổi role; thống kê hiển thị. (Không có CRUD rule.)
5. `npm run build` + `typecheck` pass cho cả core / dashboard / admin.

## 9. Rủi ro & lưu ý
- Di chuyển Prisma schema là blast-radius lớn nhất → làm xong Phase A phải verify dashboard trước khi sang B.
- Type augmentation `next-auth` phải được cả 2 app nhìn thấy.
- Khác biệt phong cách: dashboard là "Mono-ink/Hairline" (viền thay bóng), shadcn mặc định có shadow/radius — ta chỉ đồng bộ **font + màu**, phần còn lại theo shadcn; chấp nhận khác biệt nhẹ.
- Prod (subdomain admin.x / app.x): cần set cookie domain dùng chung `.x` trong Auth.js — ghi trong doc deploy, không làm ở local.

# Kế hoạch: Tách Admin thành package riêng trong monorepo + hoàn thiện CRUD

> Nâng cấp từ `KE-HOACH-ADMIN-PAGE.md`: chuyển admin từ chỗ nằm lẫn trong app `dashboard`
> thành một project độc lập `packages/admin`, đồng thời làm đầy đủ CRUD (F1–F6).
> Cập nhật: 2026-06-21

---

## 1. Bối cảnh (Vì sao làm)

Hiện admin **nằm lẫn trong app dashboard**: `packages/dashboard/src/app/(admin)`, `api/admin`, `lib/db/admin.ts`. 4 trang chỉ read-only, dùng chung Prisma / Auth / Sidebar với dashboard. Mục tiêu: nâng cấp thành **một project độc lập trong monorepo** (như analyzer / dashboard / landing) và **hoàn thiện CRUD** (Rule / Category / Framework / Plan + quản lý User + thống kê).

**Quyết định kiến trúc đã chốt:**

1. **Tạo `packages/core` dùng chung**: Prisma (schema + client), Auth.js config, types, db helpers. Cả `dashboard` và `admin` import từ core.
2. **Dùng chung session DB**: admin cùng `DATABASE_URL` + cùng `AUTH_SECRET` + cùng cookie. Auth.js đang dùng `session.strategy = "database"` nên admin tra cùng bảng `Session`. Local: cookie chia sẻ giữa các port của `localhost` → login 1 lần ở dashboard là vào được admin. Admin **không tự login** — nếu chưa đăng nhập / không phải ADMIN thì redirect sang trang login của dashboard.
3. **Phạm vi**: tách package **+ làm luôn CRUD F1–F6**.

**Kết quả mong muốn:** `npm run dev:admin` chạy admin độc lập ở cổng **3002**, đăng nhập bằng session sẵn có của dashboard, có CRUD đầy đủ cho catalog + quản lý user + dashboard thống kê. Dashboard tiếp tục chạy bình thường (không hỏng).

---

## 2. Cấu trúc monorepo sau khi tách

```
packages/
  core/        <- MỚI: prisma (schema+client), auth, types, db helpers (dùng chung)
  dashboard/   -> import @core (giữ nguyên hành vi, dùng shim re-export)
  admin/       <- MỚI: Next.js app độc lập, cổng 3002, import @core
  analyzer/    (không đổi)
  landing/     (không đổi)
```

---

## 3. Nguyên tắc giảm rủi ro (quan trọng)

54 file trong dashboard import `@/lib/prisma`, `@/lib/auth`, `@/types`, `@/lib/db/*` (106 lần). Để **không phải sửa 54 file**, dùng **shim re-export**: sau khi chuyển code thật sang core, giữ lại các file cũ trong dashboard nhưng nội dung chỉ là `export * from "@github-pr-code-smell-detector/core/..."`. Dashboard giữ nguyên đường import `@/...`.

---

## 4. Phase A — Tạo `packages/core` (tầng dữ liệu + auth dùng chung)

**Cấu trúc:**
```
packages/core/
  package.json        name: "@github-pr-code-smell-detector/core"
  tsconfig.json
  prisma/             <- DI CHUYỂN từ packages/dashboard/prisma/
    schema.prisma, migrations/, seed.ts
  src/
    index.ts          re-export prisma, auth, types
    prisma.ts         <- chuyển từ dashboard/src/lib/prisma.ts
    auth.ts           <- chuyển từ dashboard/src/lib/auth.ts (sửa import types -> "./types")
    types/index.ts    <- chuyển từ dashboard/src/types (gồm cả `declare module "next-auth"`)
    db/
      admin.ts        <- chuyển từ dashboard/src/lib/db/admin.ts (mở rộng ở Phase C)
      users.ts        (mới — Phase C)
      stats.ts        (mới — Phase C)
```

**Việc cần làm:**
- `core/package.json` deps: `@prisma/client`, `@prisma/adapter-pg`, `prisma`, `pg`, `next-auth`, `@auth/prisma-adapter`. Scripts `db:generate / db:migrate / db:deploy / db:seed` (chuyển từ dashboard). Khai báo `"exports"` cho `.`, `./db/admin`, `./db/users`, `./db/stats`.
- **Lưu ý Prisma**: schema chỉ sở hữu ở MỘT nơi. Sau khi chuyển, chạy `prisma generate` từ core; `@prisma/client` hoist về root `node_modules` nên cả 2 app resolve được.
- **Lưu ý type augmentation**: file `declare module "next-auth"` (role trong session) phải nằm trong types của core và được mỗi app `include`.

**Biến dashboard thành consumer:**
- Thêm dependency `"@github-pr-code-smell-detector/core": "*"` vào `dashboard/package.json`.
- Đổi nội dung các file thành shim:
  - `dashboard/src/lib/prisma.ts` → `export { prisma } from "@github-pr-code-smell-detector/core";`
  - `dashboard/src/lib/auth.ts` → `export { auth, handlers, signIn, signOut } from "@github-pr-code-smell-detector/core";`
  - `dashboard/src/types/index.ts` → `export * from "@github-pr-code-smell-detector/core";`
  - `dashboard/src/lib/db/admin.ts` → `export * from "@github-pr-code-smell-detector/core/db/admin";` (nếu dashboard còn dùng; nếu không, xóa)
- `dashboard/next.config.ts`: thêm `transpilePackages: ["@github-pr-code-smell-detector/core"]`; giữ `serverExternalPackages: ["@prisma/adapter-pg","pg"]`.
- **Root `package.json`**: đổi script DB sang core (`db:generate / migrate / seed` → `-w packages/core`).

**Chốt Phase A khi:** dashboard + worker chạy như cũ, login/CRUD dashboard không hỏng, `prisma migrate`/`seed` chạy từ core OK.

---

## 5. Phase B — Scaffold `packages/admin` (Next.js app độc lập)

```
packages/admin/
  package.json    name: "@github-pr-code-smell-detector/admin", "dev": "next dev -p 3002"
  next.config.ts  output standalone, transpilePackages: ["...core"], serverExternalPackages
  tsconfig.json   paths { "@/*": ["./src/*"] }
  postcss + tailwind (Tailwind 4 như dashboard)
  .env.example    DATABASE_URL, AUTH_SECRET (GIỐNG dashboard), AUTH_GITHUB_ID, AUTH_GITHUB_SECRET, DASHBOARD_URL
  public/         logo (copy tối thiểu)
  src/
    app/
      layout.tsx        copy root layout dashboard (metadata "Admin · MergeTrack")
      globals.css       copy từ dashboard/src/app/globals.css (self-contained, đã port tokens)
      page.tsx          dashboard thống kê (F6)
      rules/ categories/ frameworks/ plans/ users/   (Phase C/D/E)
      api/
        rules/ categories/ frameworks/ plans/ users/ stats/   (KHÔNG cần api/auth)
    proxy.ts            guard ADMIN cho mọi route; chưa ADMIN -> redirect dashboard /login
    components/
      layout/Sidebar.tsx, TopBar.tsx, Breadcrumb.tsx   (copy + rút gọn nav cho admin)
      ui/...            SeverityBadge, DataTable, form/modal
    lib/auth.ts         re-export từ core
```

**Auth / guard cho admin (`packages/admin/src/proxy.ts`):**
- Dùng `export default auth((req) => {...})` từ core (giống dashboard proxy). Nếu `!isLoggedIn || role !== "ADMIN"`:
  - route `/api/*` → trả `403 { error: { code: "FORBIDDEN" } }`
  - còn lại → redirect sang `${DASHBOARD_URL}/login?callbackUrl=<admin-url>`.
- Admin layout giữ thêm guard `auth()` (defense-in-depth).
- **Prod note**: subdomain (admin.x / app.x) cần set cookie domain `.x` trong Auth.js để chia sẻ session.

**GitHub callback**: admin không mount `/api/auth` → không cần thêm callback URL ở GitHub App. Auth config vẫn cần `AUTH_GITHUB_ID/SECRET` để khởi tạo (đặt cùng giá trị dashboard).

**Wiring root:** thêm `"dev:admin": "next dev -w packages/admin"` và đưa admin vào script `dev` tổng (concurrently).

**Gỡ admin khỏi dashboard:**
- Xóa `dashboard/src/app/(admin)/` và `dashboard/src/app/api/admin/`.
- `dashboard/src/proxy.ts`: bỏ nhánh xử lý `/admin` & `/api/admin`.
- `dashboard/src/components/layout/Sidebar.tsx`: bỏ `adminGroup`/`isAdmin` (hoặc đổi thành link ngoài tới admin app cho user ADMIN).

**Chốt Phase B khi:** `npm run dev:admin` mở `localhost:3002`; chưa login → bị đẩy sang dashboard login; login ADMIN rồi vào lại admin → thấy trang.

---

## 6. Phase C — Backend CRUD đầy đủ trong core + API admin

**Mở rộng `core/src/db/admin.ts`** (đang có `getRules/createRule/updateRule`, `getFrameworks/updateFramework`, `getCategories/updateCategory`, `getPlansAdmin/updatePlan`):
- Thêm: `deleteRule`, `createCategory`, `deleteCategory`, `createFramework`, `deleteFramework`, `createPlan`, `deletePlan`.
- Ràng buộc khóa ngoại: rule có `findings`; category/framework có `rules`. Ưu tiên **toggle `isActive`** thay vì xóa cứng; delete phải kiểm tra ràng buộc và trả lỗi rõ ràng nếu còn tham chiếu.

**Tạo `core/src/db/users.ts` (F5):** `getUsers` (kèm `_count.repositories`, `subscription.plan`), `updateUserRole(id, role)` (chặn tự hạ quyền ở tầng API), `getUserDetail`.

**Tạo `core/src/db/stats.ts` (F6):** tổng `users / repositories / analyses / activePlans`, đếm `PrAnalysis` theo status (PENDING/RUNNING/FAILED gần đây).

**API routes trong `admin/src/app/api/`** (đã được proxy bảo vệ ADMIN; vẫn double-check `role` trong handler, trả `{ error: { code, message } }`):
- `rules/route.ts`: GET, POST, PATCH, DELETE
- `categories/`, `frameworks/`, `plans/`: GET, POST, PATCH, DELETE
- `users/route.ts`: GET, PATCH (đổi role)
- `stats/route.ts`: GET

---

## 7. Phase D — UI CRUD cho catalog (F1–F4)

Trong `admin/src/app/`:
- `rules/page.tsx`: bảng + lọc theo framework/category/status + tìm kiếm; nút **Create** mở modal form (chọn framework/category, severity, threshold) → POST; mỗi dòng Edit (PATCH), toggle `isActive`, Delete (xác nhận).
- `categories/`, `frameworks/`, `plans/`: tương tự — Create / Edit / Toggle / Delete.
- Dùng lại: `DataTable`, `SeverityBadge`, Radix Dialog/Select/Switch (đã có trong deps), class card/table/btn từ globals.css.
- F0.3: toast + loading + `router.refresh()` sau mỗi thao tác ghi (form là client component, fetch tới API admin).

## 8. Phase E — Quản lý User (F5)

- `users/page.tsx`: bảng user (email, tên, role, ngày tạo, số repo, gói subscription). Đổi role qua dropdown → PATCH `users`. Cảnh báo/chặn tự hạ quyền (ở API).
- (Tùy chọn) trang chi tiết user xem `TenantSubscription` + `SubscriptionUsage`.

## 9. Phase F — Dashboard thống kê admin (F6)

- `app/page.tsx` (trang gốc admin): các thẻ số liệu tổng từ `stats` + danh sách phân tích PENDING/RUNNING/FAILED gần đây. Sidebar admin: Overview / Rules / Categories / Frameworks / Plans / Users.

---

## 10. Các file then chốt

- **Tạo mới:** `packages/core/*` (package.json, tsconfig, src/index.ts, db/users.ts, db/stats.ts); `packages/admin/*` (toàn bộ app).
- **Di chuyển vào core:** `dashboard/prisma/` → `core/prisma/`; `dashboard/src/lib/prisma.ts`, `lib/auth.ts`, `src/types/`, `lib/db/admin.ts`.
- **Sửa (shim/wiring):** `dashboard/src/lib/prisma.ts|auth.ts`, `src/types/index.ts`, `dashboard/src/lib/db/admin.ts`, `dashboard/next.config.ts`, `dashboard/src/proxy.ts`, `dashboard/src/components/layout/Sidebar.tsx`, `dashboard/package.json`, root `package.json`.
- **Xóa khỏi dashboard:** `src/app/(admin)/`, `src/app/api/admin/`.

---

## 11. Verification (kiểm thử end-to-end)

1. **DB layer**: từ `packages/core` chạy `db:generate` + `db:migrate` + `db:seed` → OK, không lỗi schema.
2. **Dashboard không hỏng**: `npm run dev:dashboard` + `dev:worker` → login GitHub, vào repositories/billing, chạy 1 phân tích → như trước. `typecheck`/`build -w packages/dashboard` pass.
3. **Admin độc lập** (`npm run dev:admin`, cổng 3002):
   - Chưa login → bị đẩy sang `localhost:3000/login`.
   - Login user **không** ADMIN → bị chặn (redirect / 403).
   - Login user ADMIN → vào được, thấy Overview/thống kê.
4. **CRUD**: tạo/sửa/xóa/toggle thử 1 Rule, 1 Category, 1 Framework, 1 Plan → kiểm tra DB (prisma studio) + UI refresh.
5. **User mgmt**: đổi role 1 user USER→ADMIN→USER; thử tự hạ quyền chính mình → bị chặn.
6. `npm run build` (root) + `npm run typecheck` pass cho cả core / dashboard / admin.

---

## 12. Rủi ro & lưu ý

- Di chuyển Prisma schema là blast-radius lớn nhất — làm Phase A xong **phải verify dashboard** trước khi sang Phase B.
- Type augmentation `next-auth` phải được cả 2 app nhìn thấy (kiểm tra `include` trong tsconfig).
- Trùng lặp component/CSS giữa dashboard và admin được chấp nhận ở giai đoạn này; có thể tách `packages/ui` về sau (ngoài phạm vi).
- Prod (subdomain) cần cấu hình cookie domain dùng chung — ghi chú trong doc deploy, không làm ở local.

---

## 13. Thứ tự thực thi đề xuất

```
A (core)  ──►  verify dashboard  ──►  B (scaffold admin + gỡ admin khỏi dashboard)
   ──►  C (backend CRUD + API)  ──►  D (UI catalog)  ──►  E (users)  ──►  F (stats)
   ──►  verification toàn bộ
```

# Phase A — Tạo `packages/core` (tầng dữ liệu + auth dùng chung)

> Tiền đề: chưa có gì. Đây là phase nền tảng. **Phải verify dashboard không hỏng trước khi sang Phase B.**

## Mục tiêu
Tách Prisma (schema + client), Auth.js config, types, và db helpers ra package dùng chung `@github-pr-code-smell-detector/core` để cả `dashboard` và `admin` cùng import.

## Cấu trúc tạo ra
```
packages/core/
  package.json        name: "@github-pr-code-smell-detector/core"
  tsconfig.json
  prisma/             <- DI CHUYỂN từ packages/dashboard/prisma/
    schema.prisma, migrations/, seed.ts
  src/
    index.ts          re-export prisma, auth, types
    prisma.ts         <- chuyển từ dashboard/src/lib/prisma.ts
    auth.ts           <- chuyển từ dashboard/src/lib/auth.ts (đổi import types -> "./types")
    types/index.ts    <- chuyển từ dashboard/src/types (gồm `declare module "next-auth"`)
    db/
      admin.ts        <- chuyển từ dashboard/src/lib/db/admin.ts
```

## Việc cần làm
- [ ] Tạo `packages/core/package.json`
  - deps: `@prisma/client`, `@prisma/adapter-pg`, `prisma`, `pg`, `next-auth`, `@auth/prisma-adapter`
  - scripts: `db:generate`, `db:migrate`, `db:deploy`, `db:seed` (chuyển từ dashboard)
  - khai báo `"exports"`: `.` → `src/index.ts`, `./db/admin` → `src/db/admin.ts` (và sau này `./db/users`, `./db/stats`)
- [ ] Tạo `packages/core/tsconfig.json` (target/module như dashboard; nếu cần path alias nội bộ thì thêm).
- [ ] Di chuyển `prisma/` từ dashboard sang core; `seed.ts` đổi import nếu cần.
- [ ] Di chuyển `prisma.ts`, `auth.ts`, `types/` , `db/admin.ts` sang core; sửa các import nội bộ (`@/types` → `./types`, `./prisma`).
- [ ] `src/index.ts`: `export { prisma } from "./prisma"; export { auth, handlers, signIn, signOut } from "./auth"; export * from "./types";`
- [ ] Chạy `prisma generate` từ core. Lưu ý `@prisma/client` hoist về root `node_modules` → cả 2 app resolve được.

## Biến dashboard thành consumer (shim)
- [ ] Thêm `"@github-pr-code-smell-detector/core": "*"` vào `dashboard/package.json`.
- [ ] Đổi nội dung thành shim:
  - `dashboard/src/lib/prisma.ts` → `export { prisma } from "@github-pr-code-smell-detector/core";`
  - `dashboard/src/lib/auth.ts` → `export { auth, handlers, signIn, signOut } from "@github-pr-code-smell-detector/core";`
  - `dashboard/src/types/index.ts` → `export * from "@github-pr-code-smell-detector/core";`
  - `dashboard/src/lib/db/admin.ts` → `export * from "@github-pr-code-smell-detector/core/db/admin";` (nếu dashboard còn dùng; nếu không thì xóa)
- [ ] `dashboard/next.config.ts`: thêm `transpilePackages: ["@github-pr-code-smell-detector/core"]` (giữ `serverExternalPackages: ["@prisma/adapter-pg","pg"]`).
- [ ] Root `package.json`: đổi script DB sang core (`db:generate/migrate/seed` → `-w packages/core`).
- [ ] `npm install` ở root để link workspace.

## Lưu ý kỹ thuật
- **Prisma schema chỉ sở hữu ở MỘT nơi** (core). Không để 2 schema.
- **Type augmentation `next-auth`** (role trong `session.user`) phải nằm trong `core/src/types` và được dashboard `include` (qua shim `export *` là đủ vì TS sẽ kéo theo augmentation).

## Tiêu chí hoàn thành (DoD)
- `prisma migrate` / `seed` chạy từ `packages/core` OK.
- Dashboard chạy `dev` + worker bình thường; login GitHub, vào repositories/billing, chạy 1 phân tích → như trước.
- `npm run typecheck -w packages/dashboard` và `build -w packages/dashboard` pass.

## Verify
```
# từ packages/core
npm run db:generate -w packages/core
npm run db:migrate  -w packages/core
npm run db:seed     -w packages/core
# dashboard không hỏng
npm run dev:dashboard
npm run dev:worker
npm run typecheck -w packages/dashboard
```

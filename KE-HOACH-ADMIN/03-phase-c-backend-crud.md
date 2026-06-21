# Phase C — Backend CRUD đầy đủ (core/db) + API routes admin

> Tiền đề: Phase A (core) + Phase B (admin scaffold) xong.

## Mục tiêu
Bổ sung đủ hàm dữ liệu trong `core/src/db` và tạo API routes trong admin để phục vụ CRUD F1–F6.

> ⚠️ **Không làm CRUD Rule** ở phase này (xem ghi chú tổng quan). Giữ nguyên các hàm rule sẵn có trong `admin.ts` (`getRules` dùng để đếm tham chiếu), **không** thêm API/UI cho rule.

## C1. Mở rộng `core/src/db/admin.ts`
Hiện có: `getRules/createRule/updateRule`, `getFrameworks/updateFramework`, `getCategories/updateCategory`, `getPlansAdmin/updatePlan`.
- [ ] Thêm `createCategory`, `deleteCategory`.
- [ ] Thêm `createFramework`, `deleteFramework`.
- [ ] Thêm `createPlan`, `deletePlan`.
- [ ] Ràng buộc khóa ngoại: category/framework có `rules`. Ưu tiên **toggle `isActive`** thay vì xóa cứng. Delete phải kiểm tra ràng buộc và trả lỗi rõ ràng nếu còn rule tham chiếu.

## C2. Tạo `core/src/db/users.ts` (F5)
- [ ] `getUsers()` — kèm `_count.repositories`, `subscription.plan`.
- [ ] `getUserDetail(id)` — kèm `TenantSubscription`, `SubscriptionUsage`.
- [ ] `updateUserRole(id, role)` — đổi role (chặn tự hạ quyền chính mình ở tầng API).

## C3. Tạo `core/src/db/stats.ts` (F6)
- [ ] `getAdminStats()` — tổng `users / repositories / analyses / activePlans`.
- [ ] `getRecentAnalyses()` — đếm/list `PrAnalysis` theo status (PENDING/RUNNING/FAILED) gần đây.
- [ ] Cập nhật `core/package.json` `exports`: thêm `./db/users`, `./db/stats`.

## C4. API routes trong `admin/src/app/api/`
Đã được `proxy.ts` bảo vệ ADMIN; vẫn double-check `role` trong handler; lỗi trả `{ error: { code, message } }`. (**Không** tạo `rules/route.ts`.)
- [ ] `categories/route.ts`: GET, POST, PATCH, DELETE
- [ ] `frameworks/route.ts`: GET, POST, PATCH, DELETE
- [ ] `plans/route.ts`: GET, POST, PATCH, DELETE
- [ ] `users/route.ts`: GET, PATCH (đổi role)
- [ ] `stats/route.ts`: GET

## Tiêu chí hoàn thành (DoD)
- Mọi hàm db build + typecheck OK; export đúng qua `@core/db/*`.
- Gọi thử từng API (curl/REST client với cookie ADMIN) trả đúng; không ADMIN → 403.

## Verify
```
npm run typecheck -w packages/core
npm run typecheck -w packages/admin
# với cookie session ADMIN, thử:
#   GET/POST/PATCH/DELETE /api/categories, /api/frameworks, /api/plans
#   GET/PATCH /api/users ; GET /api/stats
# kiểm tra dữ liệu đổi trong Prisma Studio: npm run db:studio -w packages/core
```

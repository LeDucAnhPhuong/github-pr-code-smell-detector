# Kế hoạch & Đặc tả chức năng cho Trang Admin

> Tài liệu chuẩn bị trước khi implement trang quản trị (admin) của dashboard.
> Cập nhật: 2026-06-21 · Phạm vi: `packages/dashboard`

---

## 1. Hiện trạng (đã kiểm chứng trong code)

### 1.1. Đã có

| Thành phần | Đường dẫn | Trạng thái |
|---|---|---|
| Layout admin (chặn quyền) | `src/app/(admin)/admin/layout.tsx` | ✅ Guard `role === "ADMIN"`, không phải admin thì `redirect("/")` |
| Trang Rules | `src/app/(admin)/admin/rules/page.tsx` | ⚠️ Chỉ hiển thị bảng (read-only). Nút "Create rule" có UI nhưng **chưa nối hành động** |
| Trang Categories | `src/app/(admin)/admin/categories/page.tsx` | ⚠️ Chỉ hiển thị bảng (read-only) |
| Trang Frameworks | `src/app/(admin)/admin/frameworks/page.tsx` | ⚠️ Chỉ hiển thị bảng (read-only) |
| Trang Plans | `src/app/(admin)/admin/plans/page.tsx` | ⚠️ Chỉ hiển thị bảng (read-only) |
| API Rules | `src/app/api/admin/rules/route.ts` | ✅ `GET`, `POST` (tạo), `PATCH` (sửa) |
| API Categories | `src/app/api/admin/categories/route.ts` | ✅ `GET`, `PATCH` (sửa) |
| API Frameworks | `src/app/api/admin/frameworks/route.ts` | ✅ `GET`, `PATCH` (sửa) |
| API Plans | `src/app/api/admin/plans/route.ts` | ✅ `GET`, `PATCH` (sửa) |
| Tầng truy vấn DB | `src/lib/db/admin.ts` | ✅ `getRules/createRule/updateRule`, `getFrameworks/updateFramework`, `getCategories/updateCategory`, `getPlansAdmin/updatePlan` |

### 1.2. Còn thiếu / chưa hoàn thiện

- **UI chưa có thao tác ghi (write):** tất cả 4 trang đều chỉ là bảng tĩnh — chưa có form/modal để tạo hoặc sửa.
- **Sidebar thiếu liên kết:** `Sidebar.tsx` chỉ có 1 mục admin trỏ tới `/admin/rules`, **thiếu link** tới categories / frameworks / plans.
- **Không có xoá (DELETE):** không API nào hỗ trợ xoá.
- **Không có tạo mới** cho category / framework / plan (chỉ rule có `POST`).
- **Chưa có quản lý người dùng (User/role)** dù schema đã có `UserRole { USER, ADMIN }`.
- **Chưa có quản lý subscription của tenant** (model `TenantSubscription` đã tồn tại).
- **Chưa có trang tổng quan/thống kê** cho admin.

---

## 2. Danh sách chức năng cần implement

### 2.1. Khung & điều hướng (Nền tảng)

- [ ] **F0.1 — Bổ sung điều hướng admin:** thêm link tới `/admin/rules`, `/admin/categories`, `/admin/frameworks`, `/admin/plans` (và các trang mới) trong `Sidebar.tsx` (nhánh `isAdmin`).
- [ ] **F0.2 — Bảo vệ API đồng nhất:** chuẩn hoá kiểm tra `role === "ADMIN"` cho mọi route admin, trả `403 FORBIDDEN` đúng định dạng `{ error: { code, message } }`.
- [ ] **F0.3 — Phản hồi UI sau thao tác:** toast/thông báo thành công–lỗi, trạng thái loading, refresh dữ liệu sau khi ghi.

### 2.2. Quản lý Rule (Quy tắc phát hiện code smell)

Model `Rule`: `id, name, description, whyItMatters, frameworkId, categoryId, defaultSeverity, defaultThreshold?, isActive`.

- [ ] **F1.1 — Danh sách & lọc:** bảng rule, lọc theo framework / category / trạng thái, tìm kiếm theo tên/id.
- [ ] **F1.2 — Tạo rule:** form tạo (nối nút "Create rule" hiện có) → `POST /api/admin/rules`. Chọn framework & category từ danh sách, chọn `defaultSeverity` (error/warning/info), `defaultThreshold` tuỳ chọn.
- [ ] **F1.3 — Sửa rule:** chỉnh `name, description, whyItMatters, defaultSeverity, defaultThreshold` → `PATCH /api/admin/rules`.
- [ ] **F1.4 — Bật/tắt rule:** toggle `isActive` (PATCH).
- [ ] **F1.5 — (Tuỳ chọn) Xoá rule:** cần bổ sung `DELETE` + cân nhắc ràng buộc với `findings` đang tham chiếu.

### 2.3. Quản lý Category (Nhóm quy tắc)

Model `Category`: `name (unique), description?, defaultSeverity, isActive` + đếm số rule.

- [ ] **F2.1 — Danh sách:** bảng category kèm số rule (`_count.rules`).
- [ ] **F2.2 — Tạo category:** cần bổ sung `POST` + `createCategory` trong `db/admin.ts`.
- [ ] **F2.3 — Sửa category:** chỉnh `description, defaultSeverity` → `PATCH` (đã có `updateCategory`).
- [ ] **F2.4 — Bật/tắt category:** toggle `isActive`.

### 2.4. Quản lý Framework (Ngôn ngữ/framework hỗ trợ)

Model `Framework`: `name (unique), supportedExtensions[], isActive` + đếm số rule.

- [ ] **F3.1 — Danh sách:** bảng framework kèm danh sách phần mở rộng & số rule.
- [ ] **F3.2 — Tạo framework:** cần bổ sung `POST` + `createFramework`.
- [ ] **F3.3 — Sửa framework:** chỉnh `supportedExtensions` (thêm/bớt extension) → `PATCH` (đã có `updateFramework`).
- [ ] **F3.4 — Bật/tắt framework:** toggle `isActive`.

### 2.5. Quản lý Gói đăng ký (Subscription Plan)

Model `SubscriptionPlan`: `name (unique), price, repositoryLimit, analysisQuota, hasCheckAnnotations, hasHistoricalReports, isActive`.

- [ ] **F4.1 — Danh sách:** bảng gói (giá, giới hạn repo, quota phân tích, các tính năng).
- [ ] **F4.2 — Tạo gói:** cần bổ sung `POST` + `createPlan`.
- [ ] **F4.3 — Sửa gói:** chỉnh giá, giới hạn, quota, các cờ tính năng → `PATCH` (đã có `updatePlan`).
- [ ] **F4.4 — Bật/tắt gói:** toggle `isActive` (gói tắt sẽ không cho đăng ký mới).

### 2.6. (Mở rộng — chưa có nền tảng) Quản lý Người dùng

Schema đã có `User.role` (`USER`/`ADMIN`) nhưng **chưa có API/trang**.

- [ ] **F5.1 — Danh sách user:** email, tên, role, ngày tạo, số repo.
- [ ] **F5.2 — Đổi role:** nâng/hạ quyền `USER ↔ ADMIN` (cần API mới + cảnh báo tự-hạ-quyền chính mình).
- [ ] **F5.3 — Xem subscription của user:** liên kết tới `TenantSubscription` (gói, trạng thái, ngày gia hạn).
- [ ] **F5.4 — (Tuỳ chọn) Xem usage:** dữ liệu `SubscriptionUsage` theo tháng (analysisCount, repositoryCount, reportCount).

### 2.7. (Mở rộng) Tổng quan / Thống kê Admin

- [ ] **F6.1 — Dashboard admin:** số liệu tổng (tổng user, tổng repo, tổng phân tích, gói đang hoạt động).
- [ ] **F6.2 — Trạng thái hệ thống:** số phân tích `PENDING/RUNNING/FAILED` gần đây (từ `PrAnalysis`).

---

## 3. Thứ tự ưu tiên đề xuất

1. **F0.1–F0.3** (nền tảng điều hướng + phản hồi UI) — bắt buộc trước.
2. **F1.2–F1.4** (Rule CRUD) — đã có sẵn API, chỉ cần UI.
3. **F2.3 / F3.3 / F4.3** (sửa category/framework/plan) — đã có API PATCH.
4. **F2.2 / F3.2 / F4.2** (tạo mới) — cần bổ sung API + hàm DB.
5. **F5.x** (quản lý user) — cần dựng API + trang mới.
6. **F6.x** (thống kê) — mở rộng sau cùng.

---

## 4. Việc cần bổ sung ở tầng dưới UI

Khi implement, sẽ cần thêm vào `src/lib/db/admin.ts` và API route tương ứng:

- `createCategory`, `createFramework`, `createPlan` (hiện chỉ rule có `create`).
- Các handler `DELETE` (nếu quyết định cho phép xoá).
- Hàm quản lý user: `getUsers`, `updateUserRole` + route `/api/admin/users`.
- Hàm thống kê tổng hợp cho dashboard admin.

> ⚠️ Lưu ý: các trường trên đều bám sát `prisma/schema.prisma` hiện tại — **không thêm field mới** ngoài schema. Nếu cần field bổ sung (ví dụ audit log, mô tả gói), phải tạo migration trước.

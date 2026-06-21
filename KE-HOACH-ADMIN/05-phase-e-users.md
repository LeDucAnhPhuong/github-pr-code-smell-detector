# Phase E — Quản lý User (F5)

> Tiền đề: Phase C (db/users + api/users) + Phase D (mẫu UI) xong.

## Mục tiêu
Trang quản lý người dùng theo phong cách shadcn-admin (giống "Users" của template).

## Việc cần làm
- [ ] `app/users/page.tsx`: DataTable user — cột: email, tên/avatar, **role** (badge), ngày tạo, số repo (`_count.repositories`), gói subscription (`subscription.plan.name`).
- [ ] Lọc theo role, tìm theo email/tên.
- [ ] **Đổi role**: dropdown/select trên từng dòng (USER ↔ ADMIN) → PATCH `/api/users`, toast + refresh.
- [ ] **Chặn tự hạ quyền**: nếu user sửa chính mình từ ADMIN → USER thì API trả lỗi; UI hiển thị cảnh báo, disable lựa chọn đó.
- [ ] (Tùy chọn) Trang/sheet chi tiết user: xem `TenantSubscription` (gói, trạng thái, renewalDate) + `SubscriptionUsage` theo tháng.

## Tiêu chí hoàn thành (DoD)
- Đổi role 1 user USER→ADMIN→USER thành công, phản ánh trong DB.
- Tự hạ quyền chính mình bị chặn (cả API và UI).

## Verify
- Đổi role qua UI, kiểm tra `User.role` trong Prisma Studio.
- Đăng nhập lại bằng user vừa nâng ADMIN → vào được admin.
- `typecheck` + `build` admin pass.

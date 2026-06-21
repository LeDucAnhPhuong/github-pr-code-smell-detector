# Phase D — UI CRUD cho catalog (F1–F4) bằng shadcn/ui

> Tiền đề: Phase C (API + db) xong.

## Mục tiêu
Dựng UI quản lý 3 catalog (Category / Framework / Plan) theo phong cách shadcn-admin: data-table + dialog form + toast.

> ⚠️ **Không làm CRUD Rule** (rules sẽ do user tự thêm phía họ — tương lai). Category/Framework chỉ hiển thị số rule để tham chiếu, không sửa rule từ admin.

## Mẫu chung cho mỗi trang (tham khảo shadcn-admin)
- **DataTable** (TanStack Table + shadcn `table`): cột, sort, filter, pagination, ô tìm kiếm, nút **Create** ở góc phải.
- **Row actions** (dropdown `⋯`): Edit, Toggle `isActive` (switch), Delete (AlertDialog xác nhận).
- **Form** trong **Dialog/Sheet**: `react-hook-form` + `zod`, gọi API rồi `toast` + `router.refresh()`.
- Component dùng lại đặt ở `admin/src/components/` (vd `data-table/`, `crud/`).

## D1. Categories (F2)
- [ ] `app/categories/page.tsx`: bảng + số rule (`_count.rules`, chỉ hiển thị).
- [ ] Create/Edit (`name`, `description`, `defaultSeverity`), Toggle, Delete.

## D2. Frameworks (F3)
- [ ] `app/frameworks/page.tsx`: bảng + danh sách extension + số rule (chỉ hiển thị).
- [ ] Create/Edit (`name`, `supportedExtensions[]` — tag input), Toggle, Delete.

## D3. Plans (F4)
- [ ] `app/plans/page.tsx`: bảng gói (price, repositoryLimit, analysisQuota, hasCheckAnnotations, hasHistoricalReports).
- [ ] Create/Edit toàn bộ field + các cờ tính năng (switch), Toggle `isActive`, Delete.

## Tiêu chí hoàn thành (DoD)
- Mỗi catalog: tạo / sửa / toggle / xóa hoạt động, UI refresh, có toast thành công–lỗi, có loading state.
- Severity hiển thị bằng badge; bảng có sort/filter/pagination.

## Verify
- Thực hiện đủ create/edit/toggle/delete 1 bản ghi mỗi loại; đối chiếu DB qua `db:studio -w packages/core`.
- `npm run typecheck -w packages/admin` + `build -w packages/admin` pass.

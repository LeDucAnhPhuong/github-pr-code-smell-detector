# Phase F — Dashboard thống kê admin (F6)

> Tiền đề: Phase C (db/stats + api/stats) xong. Đây là phase chốt.

## Mục tiêu
Trang gốc admin (`/`) là dashboard tổng quan theo phong cách shadcn-admin (cards + charts/list).

## Việc cần làm
- [ ] `app/page.tsx`: các **thẻ số liệu** (shadcn `card`): tổng users, tổng repositories, tổng analyses, số gói đang hoạt động — lấy từ `getAdminStats()`.
- [ ] **Trạng thái hệ thống**: danh sách/đếm `PrAnalysis` theo status PENDING/RUNNING/FAILED gần đây (`getRecentAnalyses()`).
- [ ] (Tùy chọn) biểu đồ đơn giản (recharts như shadcn-admin) cho analyses theo thời gian — chỉ nếu còn thời gian.
- [ ] Hoàn thiện điều hướng sidebar: Overview (trang này) / Categories / Frameworks / Plans / Users (**không có Rules**).

## Tiêu chí hoàn thành (DoD)
- Trang `/` hiển thị số liệu thật từ DB, không lỗi.
- Sidebar điều hướng đủ các mục, active state đúng.

## Verify (toàn hệ thống)
```
npm run db:generate -w packages/core && npm run db:migrate -w packages/core && npm run db:seed -w packages/core
npm run dev:dashboard   # login ADMIN
npm run dev:admin       # mở 3002
npm run build           # root: build cả core/dashboard/admin
npm run typecheck       # root
```
- Checklist cuối: guard ADMIN OK; CRUD 3 catalog (Category/Framework/Plan) OK; quản lý user OK; thống kê hiển thị; dashboard không hỏng.

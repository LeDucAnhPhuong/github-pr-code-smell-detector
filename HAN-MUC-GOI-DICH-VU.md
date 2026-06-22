# Hạn mức các gói dịch vụ (Subscription Plans)

> Giá trị **hiện tại** lấy từ DB (`SubscriptionPlan`), khớp với `packages/core/prisma/seed.ts`.
> Plan do **Admin quản lý** (Admin → Plans) nên có thể chỉnh trực tiếp trong DB/Admin — số dưới đây là mặc định seed.
> Cập nhật: 2026-06-22.

## Bảng hạn mức

| Hạn mức | Free | Pro | Team |
|---|---|---|---|
| **Giá** (VND/tháng) | 0 (Miễn phí) | 199.000 | 499.000 |
| **repositoryLimit** — số repo connect tối đa | 3 | 25 | 100 |
| **analysisQuota** — số PR analysis/tháng | 30 | 100 | 1000 |
| **tokenQuota** — token LLM/tháng (0 = ∞) | 4.000.000 | 30.000.000 | 300.000.000 |
| **hasCheckAnnotations** — GitHub Check-run annotations | ❌ | ✅ | ✅ |
| **hasHistoricalReports** — báo cáo lịch sử | ❌ | ✅ | ✅ |
| **isActive** — đang bật bán | ✅ | ✅ | ✅ |

## Ý nghĩa & nơi enforce từng hạn mức

- **`repositoryLimit`** — số repository được connect đồng thời (đếm các repo ở trạng thái `READY` / `INDEXING` / `DETECTING`).
  - Chặn khi connect: `packages/dashboard/src/lib/actions/connect.ts` → `connectRepository` (báo `LIMIT_REACHED`).
  - Downgrade vượt limit → tự `SUSPENDED` repo dư: `suspendExcessRepositories` (gọi sau khi kích hoạt gói ở SePay webhook).
  - Bật lại repo SUSPENDED phải còn slot: `reactivateRepository`.

- **`analysisQuota`** — số lần phân tích PR trong **1 tháng** (đếm trên `SubscriptionUsage.analysisCount`).
  - Kiểm tra trước khi nhận PR: `packages/dashboard/src/lib/db/billing.ts` → `checkQuota` (webhook chặn với `QUOTA_EXCEEDED` khi vượt).
  - Cộng dồn khi phân tích xong: `worker/processors/analysis.processor.ts` (tăng `analysisCount`).

- **`tokenQuota`** — trần token LLM (prompt+completion) tiêu trong **1 tháng** (gộp Overview + PR). `0` = không giới hạn.
  - Kiểm tra: `checkTokenBudget` (webhook chặn PR; overview processor skip/INDEX_FAILED khi vượt).
  - Cộng dồn: `SubscriptionUsage.tokenUsed` (+`costUsd` để theo dõi) ở cả 2 worker. Chi tiết: `KE-HOACH-LLM-MIGRATION/09`.

- **`hasCheckAnnotations`** — có publish **GitHub Check run + annotations** (chú thích inline theo dòng) hay không.
  - Bật trong pipeline: `worker/processors/analysis.processor.ts` → gọi `publishCheckRun` chỉ khi `plan.hasCheckAnnotations = true`.

- **`hasHistoricalReports`** — cho phép xem **báo cáo lịch sử** (tính năng nâng cao của gói trả phí).

- **`isActive`** — gói có đang được hiển thị/bán hay không.

## Ghi chú
- Đây là **hạn mức theo gói**, áp ở tầng `TenantSubscription` của mỗi user.
- Reset quota theo tháng dựa trên khóa `SubscriptionUsage(userId, month)` (month = `YYYY*100 + MM`).
- Muốn đổi giá/hạn mức: sửa trong **Admin → Plans** hoặc cập nhật DB; không cần sửa code.
- Schema nguồn: `packages/core/prisma/schema.prisma` (model `SubscriptionPlan`).

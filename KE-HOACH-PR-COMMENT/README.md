# Kế Hoạch: Bot Comment PR là luồng con của Luồng B (SaaS)

> **Mục tiêu lớn:** Người dùng **không phải cài workflow** vào repo. Họ chỉ cần **cài 1 GitHub App** (bấm vài nút), sau đó **mỗi PR tự động có comment của bot** + kết quả được lưu vào dashboard.
>
> Nói cách khác: gộp "Luồng A (comment PR)" **vào trong** "Luồng B (webhook → phân tích → lưu DB)". Khi web nhận webhook: **phân tích → lưu DB → đồng thời bắn comment + check lên PR**.

## Bối cảnh

Trong `TONG-QUAN-HE-THONG.md`, Luồng A (GitHub Action) và Luồng B (SaaS) là 2 cách dùng tách rời. Luồng A buộc người dùng tự thêm file `.github/workflows/...` — phức tạp, không thân thiện. Kế hoạch này **bỏ yêu cầu workflow** cho người dùng cuối và biến việc comment PR thành một bước bên trong worker của Luồng B.

> CLI và GitHub Action của analyzer **vẫn giữ nguyên** cho ai muốn dùng độc lập — ta chỉ thêm con đường thứ hai (web worker) để gọi cùng logic.

## Quyết định kiến trúc cốt lõi

1. **Dùng GitHub App** (không phải OAuth thuần + webhook thủ công) làm cơ chế kết nối. Lý do chi tiết ở `00`. Bằng chứng code: webhook handler hiện tại **đã** đọc `payload.installation.id` và truyền `installationId` vào job → thiết kế vốn đã hướng tới App.
2. **Worker gọi lại engine `analyze()` của `packages/analyzer`** thay vì viết lại — đúng tinh thần "một bộ rule, nhiều con đường tiêu thụ".
3. **Bổ sung `ContentProvider` cho analyzer** để `analyze()` lấy nội dung file **qua GitHub API** (vì worker không có repo checkout trên đĩa như GitHub Action).
4. **Tái dùng `upsertPrComment` + `publishCheckRun`** sẵn có của analyzer để bắn comment/check — chỉ cần export chúng ra public API.

## Thứ tự đọc / triển khai

| File | Nội dung | Vai trò |
|---|---|---|
| `00-tong-quan-va-quyet-dinh.md` | Hiện trạng vs đích, sơ đồ luồng mới, vì sao GitHub App | Hiểu bức tranh |
| `01-tao-github-app.md` | Đăng ký GitHub App (quyền, event, key, ENV) | Phía nhà cung cấp dịch vụ |
| `02-thay-doi-analyzer.md` | `ContentProvider`, export mới, helper `publishPrResults` | Code analyzer |
| `03-thay-doi-database.md` | Model `GithubInstallation`, liên kết Repository | Prisma schema |
| `04-webhook-onboarding-va-token.md` | Webhook App, luồng cài đặt, cấp installation token | Code web (vào) |
| `05-worker-phan-tich-va-comment.md` | Worker: token → analyze → lưu DB → comment + check | Code web (xử lý) — trung tâm |
| `06-trang-huong-dan-setup.md` | Trang `/setup` trong web app hướng dẫn người dùng cài App | Màn hình onboarding |
| `07-kiem-thu-va-trien-khai.md` | Test local (smee/ngrok), checklist ENV, rollout | Vận hành |

## Quy ước trong các file

Mỗi file có: **Mục tiêu · Hiện trạng · Thay đổi cụ thể (theo từng file code) · Checklist task · Tiêu chí hoàn thành**.

## Phụ thuộc giữa các phần (làm theo thứ tự)

```
01 (tạo App, có ENV)
        │
        ├──► 02 (analyzer: ContentProvider + exports)  ── độc lập, làm song song được
        │
        └──► 03 (DB) ──► 04 (webhook + onboarding + token) ──► 05 (worker) ──► 06 (trang /setup) ──► 07 (test)
```

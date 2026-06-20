# 00 — Tổng quan & quyết định kiến trúc

## Mục tiêu

Biến việc **comment bot lên PR** thành một bước **bên trong Luồng B**, để người dùng chỉ cần **cài GitHub App** (không cần workflow file).

## Hiện trạng (code đang có)

- `web/src/app/api/webhooks/github/route.ts`: nhận webhook `pull_request`, verify chữ ký bằng `GITHUB_WEBHOOK_SECRET`, kiểm tra quota, tạo `PrAnalysis`, **enqueue job kèm `installationId`** rồi trả 202.
- `web/worker/processors/analysis.processor.ts`: **đang là stub** — chỉ chuyển trạng thái `RUNNING → COMPLETED` với 0 finding, **chưa gọi `analyze()`**, **chưa comment**.
- `analyzer`: đã có đầy đủ `analyze()`, `GitHubChangedFileProvider`, `upsertPrComment`, `publishCheckRun`, `renderMarkdown` — nhưng `analyze()` đọc file từ **đĩa** và các hàm comment/check **chưa được export** ra public API.
- `web/src/lib/auth.ts`: đăng nhập GitHub OAuth (scope `repo`), lưu `account.access_token`.

## Đích đến (sau kế hoạch)

```
Người dùng: đăng nhập web → bấm "Cài GitHub App" → chọn repo → XONG.

GitHub (PR mới)
   │  webhook (do App tự gửi, không cần user cấu hình)
   ▼
WEB  /api/webhooks/github
   │  verify (App webhook secret) → quota → tạo PrAnalysis → enqueue {installationId,...}
   ▼ (202 ngay)
WORKER  (BullMQ)
   │ 1) installationId ──► cấp installation access token (ký JWT bằng private key App)
   │ 2) GitHubChangedFileProvider(token) → danh sách file đổi
   │ 3) GitHubContentProvider(token)  → nội dung file (qua API, KHÔNG cần checkout)
   │ 4) analyze({changedFileProvider, contentProvider, config, logger})
   │ 5) LƯU findings + evaluation vào PostgreSQL
   │ 6) publishPrResults(token,...) → upsert COMMENT + publish CHECK lên PR
   ▼
Kết quả: hiện ĐỒNG THỜI ở (a) comment trong PR  và  (b) dashboard
```

**Một lần phân tích → hai đầu ra** (DB + PR). Đây chính là "Luồng A trở thành con của Luồng B".

## Vì sao chọn GitHub App (không dùng OAuth token / không bắt cài workflow)

| Tiêu chí | GitHub App ✅ (chọn) | OAuth token của user | Bắt user cài workflow (hiện tại) |
|---|---|---|---|
| Công sức của user | Cài 1 lần, chọn repo | Đăng nhập + cấp scope `repo` rộng | Tự viết & maintain YAML |
| Danh tính comment | **Bot riêng** (`tên-app[bot]`) | Hiện dưới tên **chính user** | `github-actions[bot]` |
| Webhook | **App tự gửi**, không cần đăng ký tay | Phải tự đăng ký hook qua API | Không cần (chạy trong CI) |
| Bảo mật token | Token **ngắn hạn 1h**, theo từng repo | Token dài hạn, phạm vi rộng | Token CI tạm thời |
| Thu hồi quyền | User gỡ App là xong | Phải thu hồi OAuth | Xoá file |
| Phù hợp "comment bot" | **Đúng chuẩn ngành** (CodeRabbit, Codecov…) | Không giống bot | Tùy CI |

→ GitHub App thắng tuyệt đối cho mục tiêu "dễ cài + có bot". Code hiện tại **đã** truyền `installationId` ⇒ xác nhận App là hướng đã định.

> **Lưu ý:** Vẫn cần OAuth login (Auth.js) để **nhận diện người dùng trên web**. GitHub App lo phần **quyền thao tác trên repo**. Hai thứ bổ trợ nhau: OAuth = "bạn là ai", App = "bot được làm gì trên repo của bạn".

## Phạm vi thay đổi (tóm tắt)

| Vùng | Thay đổi | File |
|---|---|---|
| GitHub (ngoài code) | Đăng ký 1 GitHub App | `01` |
| analyzer | Thêm `ContentProvider`, export helper `publishPrResults` | `02` |
| DB | Model `GithubInstallation`, cột liên kết ở `Repository` | `03` |
| web — vào | Webhook xử lý event `installation*`, helper cấp token, luồng onboarding cài App | `04` |
| web — xử lý | Viết lại `analysis.processor.ts` (bỏ stub) | `05` |
| docs | Hướng dẫn user cài App | `06` |
| vận hành | ENV, test webhook local, rollout | `07` |

## Tiêu chí hoàn thành (toàn kế hoạch)

- [ ] User mới chỉ cần: đăng nhập → cài App → chọn repo, **không chạm vào file nào trong repo**.
- [ ] Mở/Push một PR thật → trong < 1 phút xuất hiện **1 comment bot** (cập nhật chỗ cũ ở lần push sau) + **1 Check run**.
- [ ] Cùng kết quả đó hiển thị trên dashboard (findings, evaluation), quota +1.
- [ ] Không còn yêu cầu người dùng tạo `.github/workflows/...`.

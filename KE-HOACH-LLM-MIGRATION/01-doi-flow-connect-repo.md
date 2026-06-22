# 01 — Đổi flow Connect Repo (install ≠ connect)

## Mục tiêu

Tách **GitHub App installation** (App được phép đọc repo nào) khỏi **Connected repo** (repo ta thực sự index + phân tích, và là nơi enforce `repositoryLimit`). User phải **chủ động chọn** repo để connect; framework không hỗ trợ thì **reject ngay**.

## Hiện trạng

- Webhook App đã đọc `payload.installation.id` → có `GithubInstallation`.
- `Repository` tạo ra (theo flow cũ) gần như tự động, không có trạng thái connected, không enforce limit thực sự.

## Khái niệm 2 tầng

```
GithubInstallation (đã có)         →  App được cấp quyền trên 1 account/org + 1 tập repo
        │
        ▼
Repository.connectionState (MỚI)   →  repo user CHỦ ĐỘNG bật; limit tính ở đây
```

## State machine của repo

```
(chưa connect) ──connect──► DETECTING ──reject──► REJECTED (không hỗ trợ framework)
                                  │
                                  └─pass─► INDEXING ──done──► READY ──┐
                                                  └─fail──► INDEX_FAILED │
   READY ──vượt limit khi downgrade──► SUSPENDED ◄──────────────────────┘
   (SUSPENDED/REJECTED/INDEX_FAILED: KHÔNG xử lý PR event)
```

Chỉ `READY` mới cho PR analysis chạy (quyết định 2).

## Detect framework (rẻ, KHÔNG dùng LLM)

Chạy **đồng bộ** lúc user bấm Connect, vài giây:

1. Lấy file tree gốc + đọc manifest qua GitHub API (installation token):
   - JS/TS: `package.json` → dependencies có `react`?
   - (mở rộng sau) `requirements.txt`/`pyproject.toml`, `go.mod`, …
2. So với danh sách `Framework` đang `isActive` trong DB (đã có `supportedExtensions`; thêm khái niệm "manifest marker").
3. **Match** → cho phép connect, lưu `Repository.frameworkId`. **Không match** → trả lỗi `UNSUPPORTED_FRAMEWORK`, **không** tạo connection.

> ⚠️ Ghi chú đánh đổi: reject cứng theo built-in framework ⇒ thị trường khóa vào các framework đã ship built-in (hiện chỉ React) và chặn user chỉ muốn dùng custom rule. Đây là quyết định đã chốt cho Phase 1.

## Enforce `repositoryLimit`

Khi connect, đếm số repo của user đang `READY|INDEXING|DETECTING` và so với `plan.repositoryLimit`:
- Đạt/ vượt → chặn, báo "đã đạt giới hạn N repo của gói X, nâng cấp hoặc gỡ repo khác".
- Downgrade plan làm vượt limit → cron/đoạn check chuyển repo dư sang `SUSPENDED` (user tự chọn repo nào giữ — UI cho chọn).

## Consent (quyết định b)

UI Connect có **checkbox bắt buộc**: "Tôi đồng ý cho hệ thống đọc & gửi source code của repo này tới nhà cung cấp LLM để phân tích." Lưu `Repository.consentedAt = now()`. Không tick → không cho submit.

## Thay đổi cụ thể

### DB — `Repository` (chi tiết ở `06-data-model.md`)
```prisma
enum RepoConnectionState { DETECTING REJECTED INDEXING READY INDEX_FAILED SUSPENDED }

model Repository {
  // ... cột cũ giữ nguyên
  connectionState RepoConnectionState @default(DETECTING)
  frameworkId     String?
  consentedAt     DateTime?
  rejectedReason  String?
  // quan hệ Overview + RepoRule thêm ở 02/03
}
```

### Code web (`packages/dashboard`)
- **Trang "Connect repo"** mới: liệt kê repo từ installation (GitHub API `installation/repositories`), nút **Connect** từng repo, hiện trạng thái + framework detect.
- **Server action `connectRepository(githubRepoId)`**:
  1. check limit → 2. detect framework → 3. nếu pass: tạo `Repository(connectionState=DETECTING→INDEXING)`, set `consentedAt`, enqueue INDEX job → 4. nếu fail: trả lỗi, không tạo.
- **Server action `disconnectRepository` / `suspend`**: gỡ khỏi đếm limit, dừng nhận PR.

### Webhook guard
Trong handler PR event: load `Repository` theo `githubId`; nếu **không tồn tại** hoặc `connectionState != READY` ⇒ **ignore** (ack 200, không enqueue).

## Checklist task
- [ ] Migration thêm `RepoConnectionState` + cột vào `Repository`.
- [ ] Helper `detectFramework(installationId, repo)` đọc manifest, trả `frameworkId | null`.
- [ ] Server action `connectRepository` (limit → detect → consent → enqueue).
- [ ] Trang Connect repo + danh sách + nút Connect + hiển thị state.
- [ ] Guard ở webhook PR handler theo `connectionState`.
- [ ] Logic SUSPENDED khi downgrade vượt limit + UI chọn repo giữ.

## Tiêu chí hoàn thành
- [ ] Install App KHÔNG tự tạo repo connected; user phải bấm Connect.
- [ ] Repo Python/Go (chưa hỗ trợ) bị reject với lý do rõ.
- [ ] Vượt `repositoryLimit` bị chặn ở bước connect.
- [ ] PR event của repo chưa READY bị ignore.

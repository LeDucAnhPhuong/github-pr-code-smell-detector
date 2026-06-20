# 03 — Thay đổi Database (Prisma)

> File: `packages/web/prisma/schema.prisma`. Sau khi sửa: `npm run db:migrate -w packages/web` (đặt tên migration, ví dụ `github_app_installation`).

## Hiện trạng (đã thuận lợi)

- `Repository` **đã có** `installationId Int?`, `config Json?`, `webhookId Int?`, `webhookSecret String?`. Phần lớn cột cần thiết đã sẵn.
- Thiếu: một bảng theo dõi **installation của GitHub App** (ai đã cài, trên tài khoản nào) và liên kết user ↔ installation.

## Thay đổi 1 — Model `GithubInstallation`

Thêm vào schema:

```prisma
// 15. github_installations — mỗi lần user cài GitHub App lên 1 account/org
model GithubInstallation {
  id             String   @id @default(cuid())
  installationId Int      @unique            // id GitHub cấp cho lần cài
  accountLogin   String                       // owner/org cài App
  accountType    String                       // "User" | "Organization"
  userId         String?                      // user trên web đã kết nối (map khi onboarding)
  suspendedAt    DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
}
```

## Thay đổi 2 — Liên kết từ `User`

Thêm quan hệ ngược vào model `User`:

```prisma
  installations  GithubInstallation[]
```

## Thay đổi 3 — (tuỳ chọn) làm rõ ở `Repository`

`Repository.installationId` giữ nguyên (Int?), nhưng nay **bắt buộc có giá trị** với repo kết nối qua App. Không đổi kiểu để tránh phá dữ liệu cũ; chỉ đảm bảo logic onboarding luôn set nó. Có thể thêm index để worker tra cứu nhanh:

```prisma
  @@index([installationId])
```

## Ghi chú dữ liệu cũ

- Cột `webhookId`/`webhookSecret` (cho cơ chế webhook thủ công cũ) **không còn dùng** ở luồng App — có thể để lại (không xoá) để tránh migration phá vỡ, đánh dấu deprecated trong code.

## Mapping kết quả phân tích → bảng (worker sẽ ghi, xem `05`)

| Dữ liệu từ `analyze()` | Bảng đích |
|---|---|
| mỗi `Finding` | `Finding` (ruleId, ruleName, severity, filePath, lineStart/End, columnStart, message, suggestion) |
| mỗi file trong danh sách đổi | `ChangedFile` (filePath, status ANALYZED/SKIPPED/DIAGNOSTIC, findingsCount) |
| `filesAnalyzed/filesSkipped`, runtime, counts | `EvaluationResult` |
| markdown comment đã render | `AnalysisReport.content` (lưu lại đúng nội dung đã bắn lên PR) |
| trạng thái tổng | `PrAnalysis.status` + `runtimeMs` |

> `Finding.ruleId` là FK tới bảng `Rule` (seed sẵn 6 rule React, id trùng `rule.meta.id` của analyzer). Cần đảm bảo **id rule ở seed khớp id rule trong analyzer** (vd `no-large-component`). Nếu finding có ruleId chưa tồn tại trong `Rule`, để `ruleId` trỏ tới bản ghi hợp lệ hoặc nới quan hệ (kiểm tra seed ở `prisma/seed.ts`).

## Checklist

- [ ] Thêm model `GithubInstallation` + quan hệ ở `User`
- [ ] (tuỳ chọn) index `Repository.installationId`
- [ ] `npm run db:generate` + `npm run db:migrate`
- [ ] Xác nhận id rule trong `seed.ts` khớp `rule.meta.id` của analyzer

## Tiêu chí hoàn thành

- [ ] Migration chạy sạch trên DB local (Docker pg:5433).
- [ ] Có thể tạo 1 bản ghi `GithubInstallation` thử và truy vấn theo `installationId`.

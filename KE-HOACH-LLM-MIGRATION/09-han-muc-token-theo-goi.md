# 09 — Hạn mức Token theo gói (Token Budget per Subscription)

## Mục tiêu

Bổ sung **hạn mức token theo tháng** cho mỗi gói, để subscription không chỉ giới hạn
**số lượng** (`analysisQuota` = số PR, `repositoryLimit` = số repo) mà còn chặn được
**lượng token LLM thực tiêu** — bảo vệ biên lợi nhuận và chống lạm dụng (repo khổng lồ,
push liên tục, PR siêu lớn). Đây là **lưới an toàn chi phí**, không thay thế `analysisQuota`.

## Hiện trạng

- Gói chỉ giới hạn theo **số lượng**: `analysisQuota`, `repositoryLimit`. Không có hạn mức token/chi phí.
- **Không set `max_tokens`** output ở bất kỳ call nào → output không chặn.
- `LlmCallLog` đã ghi `promptTokens/completionTokens/costUsd/purpose/repositoryId` mỗi call (chỉ log, **không enforce**).
- `SubscriptionUsage(userId, month)` đã track `analysisCount` theo tháng (reset theo `month = YYYY*100+MM`).
- Cap **kích thước input** đã có (Overview: `OVERVIEW_MAX_*`; PR: `PR_MAX_DIFF_LINES`) → chặn token đầu vào phình, nhưng không giới hạn tổng theo user/tháng.
- Xem chi phí ước tính ở `08-uoc-tinh-chi-phi-va-chon-model.md`.

## Quyết định thiết kế

1. **Đơn vị giới hạn = TOKEN** (prompt + completion), không phải USD.
   - Token **model-agnostic**, không lệ thuộc biến động giá, dễ truyền đạt cho user.
   - Vẫn lưu `costUsd` trong `LlmCallLog`/`SubscriptionUsage` cho **observability/biên lợi nhuận** (không enforce).
2. **Một pool token/tháng cho mỗi user** (gộp cả Overview indexing lẫn PR analysis).
   - Lý do: cả 2 đều tốn tiền. Overview re-index tự động đã được chặn bởi cap input + debounce.
3. **Reset theo tháng**, dùng lại khóa `SubscriptionUsage(userId, month)` sẵn có.
4. **Hai tầng giới hạn**:
   - **Tầng tháng** (`tokenQuota`): trần tổng token/tháng → lưới an toàn.
   - **Tầng mỗi call** (`max_tokens` output theo `purpose`): chặn 1 call/1 job overshoot.
5. **Enforce kiểu "pre-check + cộng dồn sau"** (không hard-abort giữa call):
   - Trước khi chạy job (PR analysis / Overview index): nếu `tokenUsed >= tokenQuota` → **chặn**.
   - Trong job map-reduce: cho phép vượt **tối đa 1 job** (overshoot có giới hạn vì đã cap input + `max_tokens`).
   - Cộng token thực của job vào `SubscriptionUsage.tokenUsed` khi job xong.
   - (Tùy chọn nâng cao) dừng các MAP call còn lại khi tổng running vượt budget — để Phase 2.

## Thay đổi DB (Prisma, additive — prod đã live)

```prisma
model SubscriptionPlan {
  // ... giữ nguyên
  tokenQuota   BigInt  @default(0)   // 0 = không giới hạn (legacy/khỏi chặn)
  // (tùy chọn) trần mỗi thao tác để bound overshoot, nếu muốn cấu hình theo gói:
  // maxTokensPerAnalysis Int @default(0)
  // maxTokensPerIndex    Int @default(0)
}

model SubscriptionUsage {
  // ... giữ nguyên (analysisCount, repositoryCount, reportCount)
  tokenUsed  BigInt   @default(0)            // tổng prompt+completion token trong tháng
  costUsd    Decimal  @default(0) @db.Decimal(10,4)  // chỉ để theo dõi, không enforce
}

model LlmCallLog {
  // ... giữ nguyên
  userId String?   // THÊM: để tổng hợp token/cost theo user nhanh (analytics)
  @@index([userId])
}
```

> `BigInt` để an toàn (token/tháng của gói lớn có thể vượt giới hạn Int ~2.1 tỷ).
> `tokenQuota = 0` nghĩa là **không giới hạn** → tương thích ngược, không phá user cũ.

## `max_tokens` output theo purpose (đề xuất)

Thêm hằng số map (env override được), truyền vào client (`openrouter.ts` đã hỗ trợ `maxTokens`):

| purpose | max_tokens output |
|---|---|
| `overview_map` | 512 |
| `overview_reduce` | 2.000 |
| `pr_map` | 1.500 |
| `pr_reduce` | 800 |

## Giá trị `tokenQuota` đề xuất (admin chỉnh được)

Ước theo `08` (cân bằng): ~18k token/PR, ~108k token/lần index. Đặt **rộng rãi** để chỉ chặn lạm dụng/repo khổng lồ, không cản dùng bình thường:

| Gói | analysisQuota (PR) | tokenQuota/tháng (đề xuất) | Ghi chú |
|---|---|---|---|
| Free | 30 | **4.000.000** | đủ 30 PR + ~3 repo index vài lần |
| Pro | 100 | **30.000.000** | |
| Team | 1000 | **300.000.000** | |

> Đây là **trần an toàn**, thường không chạm tới với usage thật. Tinh chỉnh sau khi quan sát `LlmCallLog` 2–4 tuần.

## Enforcement — nơi áp

- **Helper** `checkTokenBudget(userId)` (cạnh `checkQuota` trong `src/lib/db/billing.ts`):
  trả `{ allowed, used, quota }`. `quota = 0` → luôn `allowed`.
- **PR analysis**:
  - Webhook (`api/webhooks/github/route.ts`): trước khi enqueue, gọi `checkTokenBudget` cùng `checkQuota`. Vượt → tạo `PrAnalysis FAILED` với thông báo "Token budget exceeded" (giống flow quota hiện tại).
  - Worker (`analysis.processor.ts`): sau khi xong, cộng `usage` (prompt+completion) vào `SubscriptionUsage.tokenUsed` (+ `costUsd`).
- **Overview indexing** (`overview.processor.ts`):
  - Đầu job: nếu `checkTokenBudget` không allowed → **bỏ qua re-index**, giữ Overview cũ (không để trống); với index lần đầu → `INDEX_FAILED` + lý do.
  - Cuối job: cộng token vào `SubscriptionUsage.tokenUsed`.
- **Ghi token vào usage**: tốt nhất gộp vào chỗ đang ghi `LlmCallLog` (`createLlmCallLogger`) hoặc cộng tổng/ job 1 lần (ít ghi DB hơn). Khuyến nghị **cộng theo job** (1 upsert/job).
- **userId cho LlmCallLog**: lấy từ `repository.userId` tại điểm log.

## UI

- **`packages/dashboard` — trang Usage/Billing**: thêm thanh "Token đã dùng / hạn mức" (used / quota + %), badge cảnh báo khi > 80%.
- **`packages/admin` — Plans**: thêm field `tokenQuota` (BigInt) vào form CRUD plan.
- Thông báo rõ khi bị chặn: "Đã đạt hạn mức token tháng này của gói X — nâng cấp hoặc chờ chu kỳ mới."

## Edge cases

| Tình huống | Xử lý |
|---|---|
| `tokenQuota = 0` | Không giới hạn (bỏ qua check) |
| Vượt budget giữa tháng | Chặn PR mới (FAILED có lý do); Overview re-index bị skip, giữ bản cũ |
| 1 PR/1 index làm vượt | Cho phép overshoot tối đa 1 job (đã bound bởi cap input + `max_tokens`) |
| Downgrade gói | Tháng hiện tại giữ `tokenUsed`; quota mới áp ngay (có thể đang vượt → chặn tiếp) |
| Sang tháng mới | `SubscriptionUsage` theo `month` mới → `tokenUsed` về 0 tự nhiên |
| Quota số PR còn nhưng token hết | Token thắng (chặn) — vì token là lưới chi phí |

## Lộ trình

- **Phase 1 (đo + bound, chưa chặn):** thêm cột DB; cộng `tokenUsed`/`costUsd`; thêm `max_tokens` per purpose; hiện token usage ở UI. → Quan sát số thật.
- **Phase 2 (enforce):** bật `checkTokenBudget` chặn PR + skip overview; admin chỉnh `tokenQuota`; thông báo/UX khi vượt; (tùy chọn) dừng MAP còn lại khi vượt giữa job.

## Checklist task

- [ ] Migration additive: `SubscriptionPlan.tokenQuota`, `SubscriptionUsage.tokenUsed`+`costUsd`, `LlmCallLog.userId`.
- [ ] `max_tokens` map theo purpose + truyền vào mọi call LLM.
- [ ] Cộng `tokenUsed`/`costUsd` vào `SubscriptionUsage` mỗi job (overview + PR).
- [ ] Helper `checkTokenBudget(userId)`.
- [ ] Enforce ở webhook PR + overview processor (skip/FAILED + thông báo).
- [ ] Seed `tokenQuota` cho Free/Pro/Team.
- [ ] UI Usage/Billing hiển thị token; Admin → Plans thêm field.
- [ ] Test: clamp `max_tokens`, checkTokenBudget (0 = unlimited, vượt = chặn), cộng dồn theo tháng.

## Tiêu chí hoàn thành

- [ ] Mỗi gói có `tokenQuota`; vượt → PR analysis bị chặn với thông báo rõ; Overview re-index bị skip (giữ bản cũ).
- [ ] `tokenUsed` cộng đúng theo tháng và reset khi sang tháng mới.
- [ ] `max_tokens` giới hạn output mọi call → bound overshoot.
- [ ] `tokenQuota = 0` ⇒ không giới hạn (tương thích ngược).
- [ ] UI hiển thị token đã dùng/hạn mức; Admin chỉnh được.
- [ ] Migration chạy sạch local + prod, không mất dữ liệu.

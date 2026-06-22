# 05 — OpenRouter Integration

## Mục tiêu

Một lớp client LLM dùng chung cho Overview indexing (02) và PR analysis (04): chọn model, fallback, structured output, **log token/cost mỗi call**, và trừ vào `analysisQuota`.

## Hiện trạng

Chưa có tích hợp LLM nào.

## Client

- Gọi OpenRouter Chat Completions (`https://openrouter.ai/api/v1/chat/completions`), `Authorization: Bearer $OPENROUTER_API_KEY`.
- Hỗ trợ `response_format: { type: "json_schema", ... }` cho model có structured output; fallback json mode + validate Zod.
- ENV: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL_MAP` (hoặc hằng số trong core), `OPENROUTER_APP_URL`/`X-Title` (OpenRouter khuyến nghị header attribution).

## Model map (đề xuất)

| Việc | Loại model | Lý do |
|---|---|---|
| Overview MAP (per-cụm) | rẻ, nhanh | tóm tắt đơn giản, số lượng nhiều |
| Overview REDUCE | tầm trung | tổng hợp cần mạch lạc |
| PR MAP (per-file rule check) | tầm trung | soi rule trên 1 file |
| PR REDUCE (summary + score) | mạnh (reasoning tốt) | chấm điểm cần suy luận theo overview |

- **Danh sách fallback** mỗi role (OpenRouter cho phép truyền nhiều model / dùng `models:` array) phòng rate-limit/lỗi.
- Cho phép cấu hình model qua admin (sau), Phase 1 hằng số là đủ.

## Độ bền (resilience)
- `timeout` rõ ràng mỗi call.
- Retry có backoff cho lỗi mạng/5xx/429; phân biệt lỗi parse (retry 1 lần với thông báo) vs lỗi hạ tầng.
- Concurrency limit cho MAP (cả overview lẫn PR) tránh 429.

## Logging & chi phí (bắt buộc)

```prisma
model LlmCallLog {
  id            String   @id @default(cuid())
  repositoryId  String?
  purpose       String   // "overview_map" | "overview_reduce" | "pr_map" | "pr_reduce"
  model         String
  promptTokens     Int   @default(0)
  completionTokens Int   @default(0)
  costUsd       Decimal  @default(0) @db.Decimal(10,4)
  latencyMs     Int?
  success       Boolean  @default(true)
  errorMessage  String?  @db.Text
  createdAt     DateTime @default(now())
  @@index([repositoryId])
  @@index([purpose])
}
```

- Đọc usage/cost từ response OpenRouter (trường `usage`), ghi mỗi call.
- Tổng hợp lên `ProjectOverview` (cho indexing) và `PrAnalysis` (cho PR).
- **Gắn billing:** mỗi PR analysis hoàn tất trừ 1 vào `SubscriptionUsage.analysisCount`; chặn khi vượt `plan.analysisQuota`.

## Embeddings (ghi chú phase sau)

OpenRouter mạnh ở chat, **không phải kênh chính cho embeddings**. Khi cần RAG (repo lớn / rule nhiều):
- Embeddings: provider riêng (OpenAI `text-embedding-3`, Voyage…).
- Vector store: **pgvector** (đã có Postgres + Prisma — không thêm hạ tầng).
- Chưa làm ở Phase 1 (quyết định 6).

## Bảo mật
- Không log nội dung code đầy đủ vào `LlmCallLog` (chỉ metadata/token) — tránh phình DB & rủi ro.
- API key chỉ ở worker/server, không lộ client.

## Checklist task
- [ ] Client OpenRouter (chat + json_schema + fallback models).
- [ ] Model map theo purpose.
- [ ] Retry/backoff + concurrency limit.
- [ ] Model `LlmCallLog` + ghi mỗi call.
- [ ] Trừ `analysisQuota` + chặn khi vượt.

## Tiêu chí hoàn thành
- [ ] Mọi call LLM có token/cost/latency trong `LlmCallLog`.
- [ ] Vượt `analysisQuota` → PR analysis bị chặn với thông báo.
- [ ] Model chính lỗi → fallback chạy, pipeline không vỡ.

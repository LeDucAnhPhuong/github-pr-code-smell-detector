# 07 — Lộ trình theo Phase

> Nguyên tắc: **Phase 1 đơn giản – đúng – rẻ; tối ưu sau.** Mỗi phase phải chạy được end-to-end trước khi sang phase kế.

## Phase 1 — Connect flow + Overview + tab Overview
**Mục tiêu:** install≠connect chạy thật, repo có Overview.
- `06`: migration additive (Repository state, ProjectOverview, LlmCallLog).
- `01`: trang Connect, detect framework, reject, enforce limit, consent, webhook guard.
- `05`: client OpenRouter + log (đủ cho indexing).
- `02`: job indexing map-reduce + tab Overview + **auto re-index khi push default branch** (không nút thủ công) + subscribe webhook `push`.
- **Demo được:** connect repo React → Overview READY → tab Overview hiển thị; push lên default branch → Overview tự cập nhật.

## Phase 2 — Custom rules + PR analysis (lõi)
**Mục tiêu:** PR có comment LLM.
- `03`: model `RepoRule` + CRUD markdown + lọc theo globs + toggle system rule.
- `04`: pipeline map-reduce, prompt + chống injection, Zod schema, scoring 2 thành phần, post-process, comment tổng (chưa inline).
- Backfill PR open khi Overview READY.
- **Demo được:** mở PR → 1 comment: summary + Quality Score + vi phạm [System]/[Custom] + fix.

## Phase 3 — Guardrails: chi phí, quota, privacy, eval
**Mục tiêu:** an toàn để mở cho người thật.
- Trừ `analysisQuota` + chặn vượt; cap chi phí indexing.
- Disclosure/consent hoàn chỉnh + lưu version điều khoản.
- **Eval set nhỏ:** vài PR có lỗi đã biết → đo precision/recall của rule-check + độ ổn định Quality Score.
- Observability: dashboard token/cost theo repo/user (tận dụng `LlmCallLog`).

## Phase 4 — Nâng cao (chỉ khi cần)
- **Inline review comments** (map dòng → vị trí diff) thay cho comment tổng.
- **RAG/pgvector**: embeddings code chunk + retrieval cho repo lớn / nhiều rule.
- Mở rộng built-in framework pack (Vue/Next/Python…) → nới điều kiện connect.

## Rủi ro & giảm thiểu
| Rủi ro | Giảm thiểu |
|---|---|
| Chi phí LLM phình | debounce/idempotency (04), cap indexing (02), quota (05) |
| Quality Score trôi | trần theo severity + overview ổn định + temp thấp (00) |
| False positive LLM | lọc rule theo globs, dedup, cho user dismiss finding |
| Prompt injection | delimiter + system rule coi diff là data (04) |
| Reject framework chặn user | chấp nhận Phase 1; mở built-in pack ở Phase 4 |
| Migration prod | chỉ additive, test local trước (06) |

## Kiểm thử
- Unit: parser frontmatter, lọc globs, clamp score, map line→hunk, Zod validate.
- Integration: webhook giả lập (smee/ngrok) → PR event → comment.
- Eval: bộ PR mẫu (Phase 3).
- Đã có vitest trong repo → thêm test theo từng phase.

## Tiêu chí hoàn thành (toàn dự án)
Xem checklist cuối `00-tong-quan-va-quyet-dinh.md`.

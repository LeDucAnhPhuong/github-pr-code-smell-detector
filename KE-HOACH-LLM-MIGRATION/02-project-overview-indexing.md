# 02 — Project Overview Indexing

## Mục tiêu

Khi repo connect (đã pass framework + consent), một background job dùng **LLM đọc default branch**, tóm tắt project, lưu **Project Overview** dạng phù hợp, và hiển thị ở tab **Overview**. Overview là **context nền** được inject vào mọi PR analysis.

## Hiện trạng

Chưa có. Worker hiện chỉ phân tích PR diff bằng AST.

## Lưu dưới dạng gì (quyết định 6)

- **Overview = markdown (người đọc) + JSON metadata (máy dùng)** trong Postgres. **KHÔNG vector** ở Phase 1 — đây là 1 doc luôn được inject nguyên khối, không cần retrieval.
- pgvector/RAG chỉ thêm ở phase sau nếu repo quá lớn cần kéo file liên quan theo PR.

```prisma
enum OverviewStatus { PENDING INDEXING READY FAILED }

model ProjectOverview {
  id            String         @id @default(cuid())
  repositoryId  String         @unique
  status        OverviewStatus @default(PENDING)
  indexedSha    String?        // commit đã index → biết stale
  summaryMd     String?        @db.Text   // markdown cho tab Overview + inject
  metadata      Json?          // {stack, architecture[], modules[], conventions[], domain[]}
  filesScanned  Int            @default(0)
  promptTokens  Int            @default(0)
  completionTokens Int         @default(0)
  costUsd       Decimal        @default(0) @db.Decimal(10,4)
  errorMessage  String?        @db.Text
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  repository Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
}
```

## Pipeline indexing (map-reduce — bắt buộc, repo có thể rất lớn)

1. **Lấy git tree** default branch (GitHub API `git/trees?recursive=1`).
2. **Lọc mạnh** (giảm token + tránh rác):
   - Bỏ: `node_modules`, `dist`/`build`, lockfile, ảnh/binary, file > ngưỡng KB, file generated.
   - Ưu tiên: manifest (`package.json`), config, entry points, thư mục `src`, README.
   - **Cap** tổng số file / tổng bytes để 1 repo khổng lồ không đốt tiền (vector tấn công chi phí).
3. **MAP — tóm tắt theo cụm**: gom file theo thư mục, mỗi cụm → 1 call LLM trả tóm tắt ngắn (vai trò, module chính, pattern). Chạy song song có giới hạn concurrency.
4. **REDUCE — tổng hợp project**: gộp các tóm tắt cụm + manifest → 1 call cuối ra:
   - `summaryMd`: markdown mô tả tech stack, kiến trúc, module chính, convention, domain concepts, dependencies.
   - `metadata` JSON có cấu trúc (để UI render + để PR analysis dùng).
5. Lưu `status=READY`, `indexedSha = headSha của default branch`, cộng token/cost.
6. **Backfill**: khi READY, quét PR đang `OPEN` của repo → enqueue PR analysis (quyết định 2).

> Lỗi bất kỳ bước → `status=FAILED` + `errorMessage`. Vì không có nút thủ công: **auto-retry có backoff** (vài lần) cho lần index đầu; vẫn fail thì để FAILED và lần phục hồi tiếp theo dựa vào commit mới vào default branch. (Lỗi do cap/token thì không retry vô ích — đánh dấu FAILED kèm lý do.)

## Stale & refresh (auto-only, KHÔNG có nút thủ công)

Overview cũ dần khi code đổi. **Không có nút "Re-index" thủ công.** Cơ chế duy nhất:
- **Tự re-index khi có commit mới vào default branch** — nhánh user đã chọn lúc connect (`Repository.defaultBranch`). Lắng nghe webhook `push`; nếu `ref` == default branch và `head sha` ≠ `indexedSha` → enqueue lại `indexProjectOverview`.
- **Debounce**: push dồn dập → gộp, chỉ index sha mới nhất (giữ Overview cũ tới khi bản mới READY, không để trống giữa chừng).
- Cần GitHub App **subscribe event `push`** (ngoài PR events).
- Hiển thị "Đã index ở commit `abc1234` · N file" để user biết độ mới.

> Lưu ý phân biệt: cái bỏ đi là **re-index định kỳ thủ công**. Còn **lần index đầu lúc connect** nếu `FAILED` thì vẫn cần lối phục hồi (xem ghi chú FAILED ở pipeline) — vì lúc đó chưa có commit mới nào để tự kích hoạt.

## Inject vào PR analysis — bản rút gọn

PR analysis không nhồi cả `summaryMd` dài. Dùng **bản rút gọn** từ `metadata` (stack + kiến trúc + convention chính) để tiết kiệm token. Giữ `summaryMd` đầy đủ cho tab Overview.

## Tab Overview (UI — `packages/dashboard`)

Trong repo detail, thêm tab **Overview**:
- Trạng thái index (PENDING/INDEXING/READY/FAILED) + progress nếu đang chạy.
- Render `summaryMd` + các chip từ `metadata` (stack, modules, conventions).
- "Đã index ở commit … · N file · chi phí …".
- **Không có nút Re-index** — overview tự cập nhật theo commit vào default branch. Có thể hiện badge "đang cập nhật" khi job re-index chạy nền.
- **Data-contract grounding** (theo design system của bạn): chỉ render field LLM thực sự trả, không bịa.

## Thay đổi cụ thể
- `packages/core`: model `ProjectOverview` + quan hệ vào `Repository`.
- `packages/dashboard`: tab Overview (read-only, không action button).
- Worker: job `indexProjectOverview` (map-reduce, lọc file, gọi OpenRouter qua `05`) + auto-retry backoff cho lần đầu FAILED.
- Webhook: handler event `push` → nếu `ref` == default branch & sha mới → enqueue re-index (debounce).
- GitHub API helper: lấy tree + nội dung file theo installation token.

## Checklist task
- [ ] Model `ProjectOverview` + migration.
- [ ] Helper lấy git tree + lọc file + cap.
- [ ] Job `indexProjectOverview` map-reduce, ghi token/cost.
- [ ] Backfill PR open khi READY.
- [ ] Auto-retry backoff khi lần index đầu FAILED.
- [ ] Webhook `push` → auto re-index trên default branch (debounce, so `indexedSha`).
- [ ] Tab Overview render markdown + metadata (không nút Re-index).

## Tiêu chí hoàn thành
- [ ] Connect repo → Overview tự build → READY.
- [ ] Tab Overview hiển thị tóm tắt đúng, có commit + chi phí.
- [ ] Commit mới vào default branch → Overview tự re-index, `indexedSha` cập nhật.
- [ ] Repo lớn không vượt cap chi phí đặt trước.

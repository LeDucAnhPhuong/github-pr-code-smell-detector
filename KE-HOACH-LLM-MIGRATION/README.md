# Kế Hoạch: Chuyển Rule Engine sang LLM (OpenRouter)

> **Mục tiêu lớn:** Biến hệ thống từ "static analyzer chạy 6 AST rule cố định" thành một **LLM-based code review platform**:
> - Repo **chỉ được phân tích khi user chủ động connect** (install ≠ connect), enforce `repositoryLimit` theo plan.
> - Khi connect: LLM **đọc & tóm tắt project** trên default branch → lưu **Project Overview** → hiện ở tab **Overview** mới.
> - **Rule = hybrid**: built-in (AST, có sẵn) + custom (user viết markdown, chạy bằng LLM).
> - Khi có PR: gộp Overview + rules + diff → LLM ra **Summary + Quality Score (1–5) + danh sách vi phạm + hướng fix** → comment lên PR.

## Bối cảnh & quan hệ với kế hoạch cũ

Kế hoạch này **kế thừa** `KE-HOACH-PR-COMMENT/` (GitHub App là cơ chế connect, worker gọi engine phân tích, comment qua App token) và **mở rộng** nó:

- Trước: install App → **tự** connect mọi repo → mọi PR đều bị phân tích bằng AST.
- Giờ: install App → user **chọn repo** để connect → mỗi repo có **Overview** + **custom rules** → PR được phân tích bằng **AST + LLM**.

CLI/GitHub Action của `packages/analyzer` (Luồng A) **vẫn giữ nguyên** cho ai dùng độc lập.

## Quyết định kiến trúc đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| a | **Hybrid rule**, ranh giới theo nguồn gốc: **built-in = AST** (model `Rule` hiện có), **custom = LLM** (model `RepoRule` mới) | Giữ độ chính xác/0đ của check máy móc; LLM chỉ lo phần ngữ nghĩa |
| b | **Privacy = 1 checkbox consent** lúc connect, lưu `consentedAt`. Không lọc model no-logging | User đã tin tưởng dùng dịch vụ; giữ Phase 1 đơn giản |
| c | **Quality Score** = độ hoàn thiện PR, **grounded theo Overview + Rules** (2 thành phần), không dùng rubric generic | Điểm có ý nghĩa theo từng project, vẫn ổn định nhờ trần theo severity |
| 1 | **Framework mismatch → reject ngay lúc connect** (detect rẻ qua manifest, không phải LLM) | Xóa nhiều edge case; built-in luôn áp dụng được |
| 2 | **Chờ Overview `READY` mới bắt PR events**; khi READY thì **backfill** quét PR đang open | Phân tích có ngữ cảnh đầy đủ ngay từ đầu |
| 3 | Comment: **1 dòng summary (gắn overview) + các dòng vi phạm rule** | Gọn, dễ đọc |
| 4 | **Map-reduce ngay từ đầu** cho PR analysis | PR lớn không tràn token |
| 5 | Phase 1: **comment tổng** (chưa inline); inline để phase sau | Tránh bug map dòng giai đoạn đầu |
| 6 | Vector/pgvector: **chưa dùng Phase 1**. Overview & rules inject thẳng | Tránh phức tạp sớm; thêm RAG khi gặp giới hạn thật |

## Thứ tự đọc / triển khai

| File | Nội dung | Vai trò |
|---|---|---|
| `00-tong-quan-va-quyet-dinh.md` | Hiện trạng vs đích, sơ đồ luồng đầy đủ, mô hình Quality Score | Hiểu bức tranh |
| `01-doi-flow-connect-repo.md` | install≠connect, detect+reject framework, enforce limit, consent, state machine | Code web (connect) |
| `02-project-overview-indexing.md` | LLM đọc default branch (map-reduce), lọc file, lưu Overview, tab Overview, refresh | Code worker + UI |
| `03-custom-rules.md` | Model `RepoRule`, markdown raw + parse globs/severity, CRUD, lọc theo file | Code web + DB |
| `04-pr-analysis-pipeline.md` | **Trung tâm**: trigger/idempotency, map-reduce, prompt + chống injection, JSON schema, scoring, post-processing, comment | Code worker |
| `05-openrouter-integration.md` | Client, model map, fallback, log token/cost, ghi chú embeddings | Hạ tầng LLM |
| `06-data-model.md` | Tổng hợp thay đổi Prisma (model mới + cột thêm + migration) | Prisma schema |
| `07-lo-trinh-phase.md` | 4 phase, làm gì trước, kiểm thử | Vận hành |

## Quy ước trong các file

Mỗi file có: **Mục tiêu · Hiện trạng · Thay đổi cụ thể · Checklist task · Tiêu chí hoàn thành**.

## Phụ thuộc giữa các phần

```
01 (connect-flow + framework detect + state machine)
        │
        └──► 02 (overview indexing) ──► (Overview READY là điều kiện cho PR analysis)
                    │
03 (custom rules) ──┤
                    │
05 (openrouter) ────┴──► 04 (PR analysis pipeline)  ◄── trung tâm
                                  │
06 (data model) là nền cho 01/02/03/04   ·   07 (lộ trình) gói toàn bộ
```

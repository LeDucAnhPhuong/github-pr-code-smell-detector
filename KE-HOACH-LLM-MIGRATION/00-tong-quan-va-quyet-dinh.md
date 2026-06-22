# 00 — Tổng quan & Quyết định

## Mục tiêu

Cho người đọc bức tranh đầy đủ: hệ thống đổi từ đâu sang đâu, luồng mới chạy thế nào, và mô hình tính **Quality Score** — phần dễ hiểu sai nhất.

## Hiện trạng (từ schema thật `packages/core/prisma/schema.prisma`)

- `Rule`: **global, admin-managed**, gắn `Framework` + `Category`, severity cố định → đây là **built-in AST rule** (6 React rule). Không có khái niệm rule per-repo.
- `Repository`: có `installationId`, `defaultBranch`, `config Json`. **Chưa có** trạng thái "connected", chưa có framework đã detect, chưa có consent.
- `PrAnalysis` + `ChangedFile` + `Finding` + `AnalysisReport`: pipeline phân tích + lưu finding + render comment đã tồn tại.
- `SubscriptionPlan.repositoryLimit` + `analysisQuota`: hạn mức đã có sẵn nhưng (theo flow cũ) repo tự connect nên limit ít tác dụng.

## Đích đến

```
                 ┌─────────────────────────── CONNECT (user chủ động) ───────────────────────────┐
                 │                                                                                │
 Install App ─►  │  Chọn repo ─► detect framework (rẻ) ─┬─ không match ─► REJECT                  │
                 │                                      └─ match ─► consent ✓ ─► enforce limit ─► │
                 │                                                  enqueue INDEX                 │
                 └────────────────────────────────────────────────────────────────────────────────┘
                                                   │
                          ┌────────────────────────▼─────────────────────────┐
                          │  INDEX job: LLM đọc default branch (map-reduce)    │
                          │  → Project Overview (markdown + json)  → READY     │
                          │  → backfill: quét PR đang open ─► enqueue analysis │
                          └────────────────────────┬─────────────────────────┘
                                                   │  (chỉ khi READY)
 PR event (opened/synchronize/reopened) ───────────▼─────────────────────────────────────────────
   guard: repo READY? non-draft? headSha mới? ─► debounce (giữ SHA mới nhất)
        │
        ├─ Built-in (AST) trên file đổi                    ─┐
        ├─ Lọc custom rule theo appliesTo globs             │
        ├─ MAP:  mỗi file ─► LLM (overview rút gọn + rule áp dụng + diff file) ─┤ gộp + dedup
        └─ REDUCE: notes + PR title/desc ─► summary + qualityScore             ─┘
              │
              ├─ Quality Score = Thành phần 1 (trần theo severity, tính bằng code)
              │                + Thành phần 2 (LLM xét overview-fit trong trần)
              └─ validate Zod ─► map line về hunk ─► render comment ─► edit (commentId)
```

## Hai loại rule (quyết định a)

| | Built-in | Custom |
|---|---|---|
| Model | `Rule` (có sẵn, global) | `RepoRule` (mới, per-repo) |
| Nguồn | Admin tạo | User viết markdown |
| Xử lý | **AST** (`packages/analyzer`) | **LLM** (OpenRouter) |
| Chi phí | ~0đ | Token |
| Phạm vi | Theo `Framework` của repo | Theo `appliesTo` globs user khai |
| Đánh dấu trong comment | `[System]` | `[Custom]` |

> Repo **không có custom rule** ⇒ không gọi LLM cho phần rule-check, chỉ AST + Summary/Score (vẫn cần LLM cho summary).

## Mô hình Quality Score (quyết định c) — chi tiết

Điểm 1–5 phản ánh **độ hoàn thiện PR**, neo theo **Overview + Rules** của chính project đó, **không** dùng rubric generic. Gồm 2 thành phần:

### Thành phần 1 — Trần điểm theo severity (tính bằng code, deterministic)

Vi phạm **nặng nhất** tìm được (gộp cả AST + LLM) đặt **trần**:

| Vi phạm nặng nhất | Trần điểm |
|---|---|
| Có ≥1 `error` | tối đa **2** |
| Có `warning` (không có error) | tối đa **4** |
| Chỉ `info` hoặc sạch | tối đa **5** |

→ Buộc điểm gắn cứng vào rule, giải thích được với user.

### Thành phần 2 — Overview-fit (LLM chọn trong trần)

Trong trần đã định, LLM chọn điểm cụ thể dựa trên mức khớp **Project Overview** (kiến trúc, convention, domain, mục tiêu PR):

```
5 — Bám sát kiến trúc & convention trong Overview, không vi phạm rule.
4 — Khớp Overview tốt; chỉ vi phạm info/warning nhỏ.
3 — Đúng hướng project nhưng lệch convention trong Overview, hoặc warning rõ.
2 — Mâu thuẫn kiến trúc/định hướng Overview, hoặc vi phạm error rule.
1 — Đi ngược Overview & mục tiêu PR, nhiều error, không nên merge.
```

### Chống trôi điểm
- Overview là input **ổn định** (lưu sẵn, không sinh lại mỗi lần) → cùng base giữa các lần chạy.
- `temperature` thấp (≈0.1–0.2).
- Trần ở Thành phần 1 chặn dao động lớn.
- `qualityReasoning` **bắt buộc dẫn chiếu** cả Overview lẫn rule cụ thể.

## Quyết định đã chốt (tham chiếu nhanh)

Xem bảng trong `README.md`. Ba câu hỏi mở đã được người dùng chốt:
1. **Chờ Overview READY** mới bắt PR event (+ backfill khi READY).
2. Comment: **1 dòng summary + các dòng vi phạm**.
3. **Map-reduce ngay từ đầu**.

## Tiêu chí hoàn thành (cho cả kế hoạch)

- [ ] User install App nhưng repo **không** tự phân tích cho tới khi connect.
- [ ] Connect repo non-supported-framework bị **reject** với thông báo rõ.
- [ ] `repositoryLimit` chặn đúng khi vượt.
- [ ] Mỗi repo connected có Overview hiển thị ở tab Overview.
- [ ] User CRUD được custom rule bằng markdown.
- [ ] PR mới sinh đúng 1 comment: summary + Quality Score + vi phạm `[System]`/`[Custom]` + hướng fix.
- [ ] Mọi call LLM được log token/cost; usage trừ vào `analysisQuota`.

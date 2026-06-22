# 08 — Ước tính chi phí LLM & Chọn model theo từng tác vụ

> Tài liệu nghiên cứu/ước tính chi phí cho hệ thống sau khi chuyển sang LLM (OpenRouter).
> **Chính sách model: CHỈ dùng DeepSeek / Claude (Sonnet, Haiku) / GPT — KHÔNG dùng Gemini.**
> Số liệu giá tham khảo **tháng 6/2026** — giá LLM biến động liên tục và OpenRouter có nhiều
> nhà cung cấp cho cùng một model, **luôn kiểm tra lại tại** https://openrouter.ai/models trước khi chốt.
> Ước tính dưới đây là **trần (worst-case theo cap)**; usage thật thường thấp hơn nhiều.

---

## 1. Phạm vi — 4 loại lệnh gọi LLM (`purpose`)

Hệ thống gọi LLM ở 4 vị trí (xem `05-openrouter-integration.md` và code `src/lib/llm/openrouter.ts`):

| `purpose` | Khi nào | Số lượng call | Yêu cầu model | Nhạy cảm chi phí |
|---|---|---|---|---|
| `overview_map` | Index project: tóm tắt **mỗi cụm thư mục** | Nhiều (≤ 40 cụm/repo) | Rẻ, nhanh, đủ tóm tắt | **Cao** (volume lớn) |
| `overview_reduce` | Index project: gộp thành Overview cuối | 1/lần index | Tầm trung, mạch lạc | Thấp |
| `pr_map` | Phân tích PR: soi **custom rule trên mỗi file đổi** | 1/file đổi (chỉ khi có custom rule) | Tầm trung, bám rule | Trung bình |
| `pr_reduce` | Phân tích PR: summary + Quality Score | 1/PR | **Mạnh** (suy luận, chấm điểm theo overview) | Thấp |

> Repo **không có custom rule** ⇒ bỏ toàn bộ `pr_map` (chỉ chạy AST + `pr_reduce`) ⇒ rẻ hơn nhiều.

---

## 2. Bảng giá tham khảo model ứng viên (OpenRouter, ~6/2026)

Giá theo **USD / 1 triệu token** (input / output). Đã làm tròn, mang tính tham khảo.
**Chỉ liệt kê DeepSeek / Claude / GPT** (không Gemini theo chính sách).

| Model (slug gợi ý) | Input | Output | Vai trò phù hợp |
|---|---|---|---|
| `deepseek/deepseek-v3` | $0.14 | $0.28 | map/reduce siêu rẻ |
| `openai/gpt-5-mini` | $0.25 | $2.00 | map nhanh, rẻ, chất lượng khá |
| `deepseek/deepseek-r1` | $0.55 | $2.19 | reduce có suy luận, giá thấp |
| `anthropic/claude-haiku-4.5` | $1.00 | $5.00 | map chất lượng (bám rule tốt) |
| `openai/gpt-5` | $1.25 | $10.00 | reduce tầm trung-cao |
| `openai/gpt-5.4` | $2.50 | $15.00 | reduce mạnh |
| `anthropic/claude-sonnet-4.6` | $3.00 | $15.00 | reduce mạnh, chấm điểm tốt |
| `anthropic/claude-opus-4.8` | ~$5.00 | ~$25.00 | reduce cao cấp nhất |
| `openai/gpt-5.5` | $5.00 | $30.00 | cao cấp (đắt nhất) |

> OpenRouter thu phí nạp credit ~**5.5%**, **không markup theo token** (giá khớp nhà cung cấp gốc).
> Dòng GPT-4.x/4o đã deprecate — dùng dòng **GPT-5.x**. **Slug ở trên là gợi ý**, copy đúng slug từ trang OpenRouter Models.

---

## 3. Phân tích chọn model theo từng `purpose`

- **`overview_map`** — gọi rất nhiều lần, nội dung tóm tắt đơn giản từng cụm ⇒ **rẻ nhất**: `deepseek-v3` (mặc định), fallback `gpt-5-mini`.
- **`overview_reduce`** — 1 call, cần mạch lạc để ra Overview làm context nền lâu dài ⇒ **tầm trung**: `gpt-5` hoặc `claude-sonnet-4.6`. Overview ổn định (lưu sẵn, ít sinh lại) nên đầu tư 1 call chất lượng là đáng.
- **`pr_map`** — soi rule trên 1 file, cần bám tiêu chí + ít false positive ⇒ **tầm trung**: `gpt-5-mini` (rẻ) hoặc `claude-haiku-4.5` (bám rule tốt hơn).
- **`pr_reduce`** — chấm Quality Score theo overview-fit, cần suy luận ⇒ **mạnh**: `claude-sonnet-4.6` (mặc định) hoặc `gpt-5` / `deepseek-r1`. Điểm bị **clamp theo severity** ở code nên chỉ cần ổn định + temp thấp.

Mỗi role nên cấu hình **mảng fallback** (OpenRouter cho phép) phòng rate-limit/lỗi.

---

## 4. Ba cấu hình đề xuất (`OPENROUTER_MODEL_MAP`)

### A) Tiết kiệm — tối ưu giá
```json
{
  "overview_map":    ["deepseek/deepseek-v3", "openai/gpt-5-mini"],
  "overview_reduce": ["deepseek/deepseek-v3", "openai/gpt-5-mini"],
  "pr_map":          ["deepseek/deepseek-v3", "openai/gpt-5-mini"],
  "pr_reduce":       ["deepseek/deepseek-r1", "openai/gpt-5-mini"]
}
```

### B) Cân bằng — **khuyến nghị mặc định** (đang là default trong code)
```json
{
  "overview_map":    ["deepseek/deepseek-v3", "openai/gpt-5-mini"],
  "overview_reduce": ["openai/gpt-5", "anthropic/claude-sonnet-4.6"],
  "pr_map":          ["openai/gpt-5-mini", "anthropic/claude-haiku-4.5"],
  "pr_reduce":       ["anthropic/claude-sonnet-4.6", "openai/gpt-5"]
}
```

### C) Chất lượng cao — tối ưu độ chính xác
```json
{
  "overview_map":    ["openai/gpt-5-mini", "deepseek/deepseek-v3"],
  "overview_reduce": ["anthropic/claude-sonnet-4.6", "openai/gpt-5.4"],
  "pr_map":          ["anthropic/claude-haiku-4.5", "openai/gpt-5-mini"],
  "pr_reduce":       ["anthropic/claude-opus-4.8", "anthropic/claude-sonnet-4.6"]
}
```

> Lưu ý: KHÔNG để `claude-haiku`/`sonnet` ở `overview_map` — đó là bước volume lớn, dùng model đắt sẽ đội chi phí mạnh. Giữ `overview_map` ở `deepseek-v3`/`gpt-5-mini`.

---

## 5. Giả định token mỗi thao tác

Dựa trên cấu hình thực trong code (cap & giới hạn):
`OVERVIEW_MAX_FILES=400`, `OVERVIEW_MAX_BYTES=1.5MB`, `PER_CLUSTER_CHARS=24k`,
`OVERVIEW_MAX_CLUSTERS=40`, `PR_MAX_DIFF_LINES=400`. Quy đổi ~4 ký tự = 1 token.

**Index Overview (kịch bản repo cỡ trung, ~15 cụm):**
| Bước | Input token | Output token |
|---|---|---|
| MAP (15 cụm × ~6.1k in / 0.2k out) | ~91,500 | ~3,000 |
| REDUCE | ~12,000 | ~1,500 |

**Phân tích 1 PR (cỡ trung, 8 file đổi, 5 file dính custom rule):**
| Bước | Input token | Output token |
|---|---|---|
| MAP (5 file × ~3k in / 0.4k out) | ~15,000 | ~2,000 |
| REDUCE | ~1,500 | ~400 |
| AST (built-in) | 0 (không dùng LLM) | 0 |

> PR không có custom rule: chỉ REDUCE (~1.5k in / 0.4k out) ⇒ gần như miễn phí.
> Repo khổng lồ chạm cap 40 cụm: MAP input có thể lên ~244k token (vẫn bị cap chặn).

---

## 6. Ước tính chi phí

### 6.1 Chi phí mỗi thao tác (USD)

| Cấu hình | 1 lần Index Overview | 1 PR (có custom rule) | 1 PR (không custom rule) |
|---|---|---|---|
| A. Tiết kiệm | ~$0.016 | ~$0.004 | ~$0.002 |
| B. Cân bằng | ~$0.044 | ~$0.018 | ~$0.011 |
| C. Chất lượng cao | ~$0.088 | ~$0.043 | ~$0.018 |

### 6.2 Chi phí trần theo gói/tháng (USD)

Giả định **trần**: dùng hết `analysisQuota` + mỗi repo index lại Overview ~**10 lần/tháng**
(push vào default branch, đã debounce). Thực tế thường thấp hơn nhiều.

| Gói (quota PR · repo limit) | A. Tiết kiệm | B. Cân bằng | C. Chất lượng cao |
|---|---|---|---|
| **Free** (30 PR · 3 repo) | ~$0.6 | ~$1.9 | ~$3.9 |
| **Pro** (100 PR · 25 repo) | ~$4.4 | ~$13 | ~$26 |
| **Team** (1000 PR · 100 repo) | ~$20 | ~$62 | ~$131 |

Quy đổi tham khảo (~25.000đ/USD): Pro cân bằng ≈ **325k đ/tháng**, Team cân bằng ≈ **1.55tr đ/tháng** (trần).

### 6.3 ⚠️ Cảnh báo biên lợi nhuận

Giá gói hiện tại: **Pro 199.000đ (~$8)**, **Team 499.000đ (~$20)**.
- Với cấu hình **Cân bằng/Chất lượng cao**, một gói **dùng hết quota** có thể **vượt giá bán** (Pro trần ~$13–26 > $8).
- Yếu tố tốn nhất là **Overview re-index × số repo**, không phải PR.

**Khuyến nghị:** dùng map B nhưng giữ `overview_*` ở model rẻ (như default đang để `deepseek-v3` cho `overview_map`), và siết các đòn bẩy mục 7. Cấu hình **Tiết kiệm** giữ chi phí < giá bán ở mọi gói.

---

## 7. Đòn bẩy giảm chi phí (đã có/nên thêm)

**Đã có trong code:**
- **Cap file/byte/cluster** khi index Overview (`OVERVIEW_MAX_*`) → chặn repo khổng lồ đốt tiền.
- **Debounce push** → gộp nhiều push thành 1 lần re-index (`OVERVIEW_DEBOUNCE_MS`).
- **Bỏ `pr_map` khi repo không có custom rule** → tiết kiệm phần đắt nhất của PR.
- **Idempotency theo `commitSha`** → không phân tích lại cùng 1 commit.
- **Debounce PR theo `jobId=pullRequestId`** → push liên tục chỉ phân tích SHA mới nhất.
- **Model rẻ cho map**, mạnh cho reduce (map-reduce).
- **`LlmCallLog`** ghi token/cost mỗi call → đo được chi phí thật theo repo/user.

**Nên thêm (Phase 3):**
- **Prompt caching** (overview rút gọn + system prompt lặp lại) — Anthropic/OpenAI/DeepSeek đều hỗ trợ, giảm 50–90% giá input phần cache.
- **Cap cứng chi phí index** theo gói (đã ghi chú trong plan 02/07).
- **Giảm tần suất re-index** (chỉ re-index khi diff đáng kể, không phải mọi push).
- **Dashboard observability** từ `LlmCallLog` để theo dõi $/repo, cảnh báo vượt ngưỡng.

---

## 8. Khuyến nghị chốt

1. **Mặc định cấu hình B (Cân bằng)** — đã set sẵn trong `DEFAULT_MODEL_MAP` (DeepSeek + GPT-5 + Claude Sonnet/Haiku).
2. **Gói Free dùng cấu hình A (Tiết kiệm)** để gần như không tốn chi phí.
3. **Bật prompt caching** càng sớm càng tốt (đòn bẩy lớn nhất).
4. **Giữ `overview_map` luôn ở model rẻ** (`deepseek-v3`/`gpt-5-mini`) — đây là bước volume lớn nhất.
5. **Theo dõi `LlmCallLog` 2–4 tuần đầu** với usage thật rồi tinh chỉnh `OPENROUTER_MODEL_MAP`.
6. **Kiểm tra lại slug + giá** trên openrouter.ai/models trước khi deploy.

---

## Nguồn (tham khảo giá, ~6/2026)

- [OpenRouter Models](https://openrouter.ai/models)
- [GPT-5 — OpenRouter](https://openrouter.ai/openai/gpt-5) · [GPT-5 Mini — OpenRouter](https://openrouter.ai/openai/gpt-5-mini) · [GPT-5.4 — OpenRouter](https://openrouter.ai/openai/gpt-5.4)
- [OpenRouter Pricing 2026 — Bet on AI](https://betonai.net/openrouter-pricing-2026-complete-guide-to-every-model-tier-and-hidden-cost/)
- [DeepSeek R1 API Pricing — pricepertoken](https://pricepertoken.com/pricing-page/model/deepseek-deepseek-r1)
- [LLM API Pricing 2026 — pricepertoken](https://pricepertoken.com/)
- [AI API Pricing Comparison 2026 — DevTk.AI](https://devtk.ai/en/blog/ai-api-pricing-comparison-2026/)

> Giá có thể khác giữa các nguồn do thời điểm & nhà cung cấp khác nhau trên OpenRouter —
> tài liệu này dùng mức thận trọng (cao hơn). Luôn verify trước khi chốt.

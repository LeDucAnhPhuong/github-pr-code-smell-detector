# 06 — Data Model (tổng hợp thay đổi Prisma)

## Mục tiêu

Gom toàn bộ thay đổi schema ở một chỗ để làm migration một lượt. Nền cho `01`–`05`.

> File thật: `packages/core/prisma/schema.prisma`. Nguyên tắc: **mở rộng** model có sẵn (`Repository`, `PrAnalysis`, `Finding`), **thêm mới** `ProjectOverview`, `RepoRule`, `LlmCallLog`. **Không** đụng `Rule`/`Framework`/`Category` (built-in AST).

## Enums mới
```prisma
enum RepoConnectionState { DETECTING REJECTED INDEXING READY INDEX_FAILED SUSPENDED }
enum OverviewStatus      { PENDING INDEXING READY FAILED }
enum RuleSource          { system custom }   // cho Finding.source
```

## Mở rộng `Repository`
```prisma
model Repository {
  // ... giữ nguyên cột cũ
  connectionState RepoConnectionState @default(DETECTING)
  frameworkId     String?
  consentedAt     DateTime?
  rejectedReason  String?

  overview  ProjectOverview?
  repoRules RepoRule[]
  // (toggle system rule: bảng nối hoặc field trong config — xem 03)
}
```

## Mới: `ProjectOverview` (xem 02)
Markdown + JSON metadata, status, indexedSha, token/cost. `@@unique([repositoryId])`.

## Mới: `RepoRule` (xem 03)
markdown raw `bodyMd` + `appliesTo String[]` + severity + isActive. `@@index([repositoryId])`.

## Mở rộng `PrAnalysis`
```prisma
model PrAnalysis {
  // ... giữ nguyên
  summary          String?  @db.Text
  qualityScore     Int?     // 1..5, sau clamp
  qualityReasoning String?  @db.Text
  truncated        Boolean  @default(false)
  commentId        String?  // GitHub comment id để edit-in-place
  model            String?
  promptTokens     Int      @default(0)
  completionTokens Int      @default(0)
  costUsd          Decimal  @default(0) @db.Decimal(10,4)
}
```
> `commentId` có thể đặt ở `AnalysisReport` thay vì `PrAnalysis` (report đang giữ `content`/`publishedAt`). Chọn 1 chỗ nhất quán.

## Mở rộng `Finding`
```prisma
model Finding {
  // ... giữ nguyên (ruleId/ruleName/severity/filePath/lineStart/lineEnd/message/suggestion/status)
  source RuleSource @default(system)   // phân biệt AST vs LLM
  // lineStart cho phép map fail → cân nhắc nullable nếu cần file-level finding
}
```
> Hiện `Finding.lineStart Int` (not null) + `ruleId` FK tới `Rule`. Custom rule (`RepoRule`) có id khác hệ → cân nhắc: (a) nới `ruleId` thành string tự do + bỏ FK cứng, hoặc (b) thêm cột `repoRuleId String?`. Khuyến nghị (b) để giữ FK system rule. Và cho `lineStart` nullable để hỗ trợ file-level.

## Mới: `LlmCallLog` (xem 05)
Log token/cost/latency mỗi call LLM.

## Thứ tự migration
1. Enums mới.
2. Cột thêm vào `Repository`.
3. `ProjectOverview`, `RepoRule`, `LlmCallLog`.
4. Cột thêm vào `PrAnalysis` + `Finding` (`source`, `repoRuleId?`, nullable `lineStart`).
5. (tùy) bảng toggle system rule.

> Prod đã live (VPS) — migration phải **additive/backward-compatible**: chỉ thêm cột nullable/có default, không drop. Theo đúng ràng buộc "không ảnh hưởng dữ liệu/dự án khác".

## Checklist task
- [ ] Viết migration additive theo thứ tự trên.
- [ ] `prisma generate` + cập nhật types ở `packages/core`.
- [ ] Seed/migrate thử trên DB local trước, rồi prod.

## Tiêu chí hoàn thành
- [ ] `prisma migrate` chạy sạch trên local & prod, không mất dữ liệu cũ.
- [ ] Các package (`dashboard`/`admin`/worker) build với types mới.

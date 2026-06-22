# 03 — Custom Rules (RepoRule)

## Mục tiêu

Cho user viết **rule riêng cho từng repo bằng markdown thô**, lưu raw làm source of truth + parse metadata (severity, globs) để lọc & xử lý. Custom rule chạy bằng **LLM**; built-in (`Rule`) vẫn chạy bằng **AST** — không đụng tới.

## Hiện trạng

- `Rule` (global, admin-managed) = built-in AST rule. **Giữ nguyên**, đổi tên khái niệm thành "System rule" ở UI.
- Chưa có rule per-repo do user tạo.

## Lưu dạng gì (quyết định 6)

- **Input = markdown thô**, lưu nguyên `bodyMd` làm source of truth.
- Parse **frontmatter** ra cột để filter nhanh (không cần LLM lúc lọc).
- **Chưa vector**: repo thường có ít rule → inject thẳng các rule đã lọc vào prompt. Chỉ vector hóa khi số rule quá lớn (phase sau).

```prisma
model RepoRule {
  id           String   @id @default(cuid())
  repositoryId String
  title        String
  severity     Severity @default(warning)   // dùng lại enum sẵn có
  appliesTo    String[]                       // globs, vd ["src/ui/**","**/*.tsx"]
  bodyMd       String   @db.Text              // raw markdown — source of truth
  isActive     Boolean  @default(true)
  version      Int      @default(1)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  repository Repository @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  @@index([repositoryId])
}
```

## Định dạng markdown đề xuất (frontmatter + body)

```markdown
---
title: No direct DB access in UI components
severity: error
appliesTo:
  - "src/ui/**"
  - "**/*.tsx"
---

Components trong `src/ui` không được gọi trực tiếp tới database/Prisma.
Mọi truy cập dữ liệu phải qua service layer ở `src/services`.

**Vì sao:** tách concern, dễ test, tránh side-effect trong render.
**Ví dụ vi phạm:** `await prisma.user.findMany()` ngay trong component.
```

- Khi lưu: parse frontmatter → cột `title/severity/appliesTo`; phần body → `bodyMd`.
- Frontmatter thiếu `appliesTo` → coi là **global** (áp mọi file).

## Lọc rule theo PR (dùng ở `04`)

Trước khi gọi LLM, match `appliesTo` globs với danh sách path file thay đổi:
- Có file match → include rule.
- Không match → bỏ (PR backend không kéo rule CSS vào prompt).
→ Giảm token + giảm false positive.

## CRUD (UI — `packages/dashboard`, trong repo detail)

- Tab/khu **"Rules"** chia 2 phần:
  - **System rules** (`Rule`): bật/tắt áp dụng cho repo (read-only nội dung).
  - **Your rules** (`RepoRule`): editor markdown (CRUD), preview, toggle active, hiển thị severity + appliesTo đã parse.
- Validate lúc lưu: frontmatter hợp lệ, severity ∈ enum, globs parse được.
- **Thư viện rule mẫu** (starter templates) để user copy nhanh — tránh khu rule trống.

> Lưu ý "System rules bật/tắt cho repo": cần bảng nối repo↔Rule (vd `RepoSystemRuleToggle`) hoặc field trong `Repository.config`. Mặc định bật toàn bộ rule của `Framework` repo.

## Thay đổi cụ thể
- `packages/core`: model `RepoRule` (+ cơ chế toggle system rule).
- `packages/dashboard`: tab Rules, editor markdown, server actions CRUD, parse frontmatter (vd `gray-matter`).
- Helper `selectRulesForFiles(repoId, changedPaths)` trả `{ systemRules, customRules }` đã lọc.

## Checklist task
- [ ] Model `RepoRule` + migration.
- [ ] Parser frontmatter + validate.
- [ ] CRUD UI + preview + toggle.
- [ ] Toggle system rule theo repo.
- [ ] Helper lọc rule theo globs.
- [ ] Starter templates.

## Tiêu chí hoàn thành
- [ ] User tạo/sửa/xóa custom rule bằng markdown.
- [ ] `appliesTo` lọc đúng rule theo file PR.
- [ ] System rule bật/tắt được cho từng repo.
- [ ] Rule lưu raw markdown nguyên vẹn (source of truth).

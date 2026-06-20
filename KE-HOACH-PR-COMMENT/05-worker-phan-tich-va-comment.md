# 05 — Worker: phân tích → lưu DB → comment + check (TRUNG TÂM)

> Viết lại `packages/web/worker/processors/analysis.processor.ts` (bỏ stub). Đây là nơi Luồng A "chui vào" Luồng B: **một lần phân tích, hai đầu ra (DB + PR)**.

## Đầu vào job (đã có sẵn)

`AnalysisJob` (trong `src/types`) gồm: `prAnalysisId`, `repoId`, `prNumber`, `commitSha`, `installationId`. Webhook đã enqueue đủ.

## Các bước xử lý

```
1. status = RUNNING (đã có)
2. Lấy repo từ DB theo repoId → owner, repo (tách fullName), config(Json)
3. token = getInstallationToken(installationId)          [04]
4. changedFileProvider = new GitHubChangedFileProvider(token, owner, repo, prNumber)   [analyzer]
5. contentProvider     = new GitHubContentProvider(token, owner, repo, commitSha)      [02]
6. config = buildAnalyzerConfig(repo.config)             (DB config → AnalyzerConfig, fallback defaultConfig)
7. result = await analyze({ changedFileProvider, contentProvider, config, logger, repoPath: "" })
8. LƯU DB: ChangedFile[], Finding[], EvaluationResult, AnalysisReport(markdown)
9. publishPrResults({ token, owner, repo, prNumber, sha: commitSha,
                      findings: result.findings, blocking: config.blocking, version, logger })   [02]
10. status = COMPLETED + runtimeMs; tăng SubscriptionUsage (đã có)
   (lỗi bất kỳ → status = FAILED + diagnosticMessage, throw để BullMQ retry)
```

## Phác mã (pseudocode)

```ts
import { analyze } from "github-pr-code-smell-detector";
import { GitHubChangedFileProvider, GitHubContentProvider, publishPrResults } from "github-pr-code-smell-detector";
import { getInstallationToken } from "../../src/lib/github-app";

export async function analysisProcessor(job: Job<AnalysisJob>) {
  const { prAnalysisId, repoId, prNumber, commitSha, installationId } = job.data;
  const prisma = getPrisma();
  const t0 = Date.now();
  try {
    await prisma.prAnalysis.update({ where: { id: prAnalysisId }, data: { status: "RUNNING", startedAt: new Date() } });

    const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });
    const [owner, name] = repo.fullName.split("/");

    const token = await getInstallationToken(installationId);
    const changedFileProvider = new GitHubChangedFileProvider(token, owner, name, prNumber);
    const contentProvider     = new GitHubContentProvider(token, owner, name, commitSha);
    const config = buildAnalyzerConfig(repo.config);   // helper map DB → AnalyzerConfig

    const result = await analyze({ changedFileProvider, contentProvider, config, logger, repoPath: "" });

    // --- LƯU DB (trong transaction) ---
    await prisma.$transaction(async (tx) => {
      await tx.finding.createMany({ data: result.findings.map(mapFinding(prAnalysisId)) });
      await tx.changedFile.createMany({ data: buildChangedFileRows(prAnalysisId, result) });
      await tx.evaluationResult.create({ data: {
        prAnalysisId, runtimeMs: Date.now() - t0,
        filesAnalyzed: result.filesAnalyzed, filesSkipped: result.filesSkipped,
        rulesEvaluated: countRules(config), findingsCount: result.findings.length,
        diagnosticsCount: result.diagnostics.length,
      }});
      const markdown = renderMarkdown(result.findings, VERSION);
      await tx.analysisReport.create({ data: { prAnalysisId, content: markdown, status: "PUBLISHED", publishedAt: new Date() } });
    });

    // --- BẮN LÊN PR ---
    await publishPrResults({
      token, owner, repo: name, prNumber, sha: commitSha,
      findings: result.findings, blocking: Boolean(config.blocking), version: VERSION, logger,
    });

    await prisma.prAnalysis.update({ where: { id: prAnalysisId },
      data: { status: "COMPLETED", completedAt: new Date(), runtimeMs: Date.now() - t0 } });

    await bumpUsage(prisma, prAnalysisId);   // logic tăng SubscriptionUsage (giữ như cũ)
  } catch (err) {
    await prisma.prAnalysis.update({ where: { id: prAnalysisId },
      data: { status: "FAILED", diagnosticMessage: msg(err), completedAt: new Date() } });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
```

## Các helper cần viết

| Helper | Nhiệm vụ |
|---|---|
| `buildAnalyzerConfig(repo.config)` | Map JSON cấu hình repo (rules on/off, threshold, severity, target/excludePaths, blocking) sang `AnalyzerConfig`. Trống → `defaultConfig`. |
| `mapFinding(prAnalysisId)` | `Finding` (analyzer) → row Prisma `Finding`. Chú ý `ruleId` phải khớp bảng `Rule`. |
| `buildChangedFileRows(...)` | Suy ra ANALYZED/SKIPPED/DIAGNOSTIC + `findingsCount` mỗi file từ result. |
| `bumpUsage(...)` | Tăng `SubscriptionUsage` (đã có sẵn logic, tách ra hàm). |

## Lưu ý quan trọng

- **`repoPath: ""`**: khi có `contentProvider`, `analyze()` không đụng đĩa (xem `02`). Truyền chuỗi rỗng là đủ.
- **Phân quyền lưu DB**: worker chạy nền, **không có session user** → đây là ngoại lệ hợp lệ của quy tắc "mọi query kèm userId". Worker thao tác theo `repoId/prAnalysisId` từ job đã được webhook xác thực. Vẫn nên gói qua helper trong `src/lib/db/*` nếu muốn nhất quán.
- **Idempotent khi retry**: nếu job chạy lại (BullMQ retry), tránh nhân đôi `Finding`. Cách đơn giản: đầu bước lưu, `deleteMany({ where: { prAnalysisId } })` cho Finding/ChangedFile trước khi `createMany`.
- **Comment vẫn 1 cái/PR**: `upsertPrComment` (bên trong `publishPrResults`) tự tìm marker `<!-- code-smell-detector -->` và sửa comment cũ → push nhiều lần vẫn 1 comment.
- **Check `hasCheckAnnotations`**: gói Free có thể tắt annotation (xem `SubscriptionPlan.hasCheckAnnotations`). Cân nhắc chỉ gọi phần check-run khi plan cho phép.

## Checklist

- [ ] Bỏ stub, cài đặt 10 bước ở trên
- [ ] 4 helper (`buildAnalyzerConfig`, `mapFinding`, `buildChangedFileRows`, `bumpUsage`)
- [ ] Lưu DB trong transaction + idempotent khi retry
- [ ] Gọi `publishPrResults`
- [ ] Tôn trọng `hasCheckAnnotations`/`blocking` theo plan & config

## Tiêu chí hoàn thành

- [ ] Enqueue 1 job thật (PR test) → DB có Finding/ChangedFile/EvaluationResult/AnalysisReport; PR có comment + check.
- [ ] Push thêm commit vào PR → comment **được cập nhật** (không tạo mới), tạo `PrAnalysis` mới.
- [ ] Lỗi token/parse → `PrAnalysis.status = FAILED` với message rõ ràng.

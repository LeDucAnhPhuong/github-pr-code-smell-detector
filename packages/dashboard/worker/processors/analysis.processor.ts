import type { Job } from "bullmq";
import type { AnalysisJob } from "../../src/types";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  analyze,
  GitHubChangedFileProvider,
  GitHubContentProvider,
  getRuleById,
  ALL_RULES,
  DEFAULT_CONFIG,
  type AnalyzerConfig,
  type Finding as AstFinding,
  type Logger,
} from "github-pr-code-smell-detector";
import { getInstallationToken, getPrChangedFiles, getPrHeadSha } from "../../src/lib/github-app";
import { selectRulesForFiles, filterCustomRulesByPaths } from "../../src/lib/rules/select-rules";
import { isExcluded } from "../../src/lib/overview/file-filter";
import { condenseOverview, mapWithConcurrency, type OverviewMetadata } from "../../src/lib/overview/prompts";
import { annotateDiff, resolveFindingLine } from "../../src/lib/pr/diff";
import {
  MAP_SYSTEM,
  REDUCE_SYSTEM,
  buildMapPrompt,
  buildReducePrompt,
  validateMapOutput,
  validateReduceOutput,
  MAP_JSON_SCHEMA,
  REDUCE_JSON_SCHEMA,
  severityCeiling,
  clampScore,
  dedupeFindings,
  type NormalizedFinding,
  type RuleForPrompt,
  type Severity,
} from "../../src/lib/pr/analysis";
import { renderPrComment } from "../../src/lib/pr/comment";
import { upsertPrComment } from "../../src/lib/pr/post-comment";
import { publishCheckRun } from "../../src/lib/pr/check-run";
import { callLlmJsonLogged, createLlmCallLogger } from "../../src/lib/llm/logged";
import type { LlmUsage } from "../../src/lib/llm/openrouter";

const MAP_CONCURRENCY = Number(process.env.PR_MAP_CONCURRENCY ?? 4);

function getPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const logger: Logger = {
  debug: (m) => console.debug(m),
  info: (m) => console.log(m),
  warning: (m) => console.warn(m),
  error: (m) => console.error(m),
};

function buildAnalyzerConfig(raw: unknown): AnalyzerConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;
  const c = raw as Partial<AnalyzerConfig>;
  return {
    blocking: c.blocking ?? DEFAULT_CONFIG.blocking,
    excludePaths: c.excludePaths ?? DEFAULT_CONFIG.excludePaths,
    targetPaths: c.targetPaths ?? DEFAULT_CONFIG.targetPaths,
    rules: c.rules ?? DEFAULT_CONFIG.rules,
  };
}

/** Map an AST finding to our normalized shape (source=system). */
function normalizeAstFinding(f: AstFinding): NormalizedFinding {
  return {
    source: "system",
    ruleId: f.ruleId,
    repoRuleId: null,
    ruleName: getRuleById(f.ruleId)?.meta.title ?? f.ruleId,
    severity: f.severity as Severity,
    filePath: f.file,
    lineStart: f.range.start.line,
    message: f.message,
    suggestion: f.suggestion ?? null,
  };
}

function addUsage(a: LlmUsage, b: LlmUsage): LlmUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    costUsd: a.costUsd + b.costUsd,
  };
}

export async function analysisProcessor(job: Job<AnalysisJob>) {
  const { prAnalysisId, repoId, prNumber, commitSha, installationId } = job.data;
  const prisma = getPrisma();
  const t0 = Date.now();

  try {
    if (!installationId) throw new Error("Missing installationId — repository not connected via GitHub App");

    // Idempotency: if another analysis already COMPLETED for this exact SHA, skip.
    const done = await prisma.prAnalysis.findFirst({
      where: {
        pullRequest: { repositoryId: repoId },
        commitSha,
        status: "COMPLETED",
        id: { not: prAnalysisId },
      },
      select: { id: true },
    });
    if (done) {
      await prisma.prAnalysis.update({
        where: { id: prAnalysisId },
        data: { status: "COMPLETED", completedAt: new Date(), diagnosticMessage: "Skipped: SHA already analyzed" },
      });
      return { skipped: true };
    }

    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });
    const [owner, name] = repo.fullName.split("/");
    const config = buildAnalyzerConfig(repo.config);
    const token = await getInstallationToken(installationId);

    // ── AST (system rules) — runs regardless of custom rules ──
    const changedFileProvider = new GitHubChangedFileProvider(token, owner, name, prNumber);
    const contentProvider = new GitHubContentProvider(token, owner, name, commitSha);
    const changedFiles = await changedFileProvider.getChangedFiles();
    const astResultPromise = analyze({ changedFileProvider, contentProvider, config, logger, repoPath: "" });

    // ── Gather PR diffs + applicable rules + overview ──
    const prFiles = await getPrChangedFiles(installationId, owner, name, prNumber);
    const analyzable = prFiles.filter((f) => f.status !== "removed" && f.patch && !isExcluded(f.filename));
    const changedPaths = analyzable.map((f) => f.filename);

    const { customRules } = await selectRulesForFiles(prisma, repoId, changedPaths);

    const overviewRow = await prisma.projectOverview.findUnique({ where: { repositoryId: repoId } });
    const overview = overviewRow?.metadata
      ? condenseOverview(overviewRow.metadata as unknown as OverviewMetadata)
      : "";

    let usage: LlmUsage = { promptTokens: 0, completionTokens: 0, costUsd: 0 };
    let model: string | null = null;
    let truncatedAny = false;
    const llmCtx = { repositoryId: repoId, log: createLlmCallLogger(prisma, repoId) };

    const astResult = await astResultPromise;
    const findings: NormalizedFinding[] = astResult.findings.map(normalizeAstFinding);
    const notes: { file: string; note: string }[] = [];

    // ── MAP (custom rules, LLM) — only when there are custom rules ──
    if (customRules.length > 0 && analyzable.length > 0) {
      const validRuleIds = new Set(customRules.map((r) => r.id));
      const ruleById = new Map(customRules.map((cr) => [cr.id, cr]));
      const mapResults = await mapWithConcurrency(analyzable, MAP_CONCURRENCY, async (file) => {
        const rulesForFile = filterCustomRulesByPaths(customRules, [file.filename]);
        if (rulesForFile.length === 0) return null;
        const diff = annotateDiff(file.patch);
        if (diff.truncated) truncatedAny = true;
        const rulesForPrompt: RuleForPrompt[] = rulesForFile.map((r) => ({
          id: r.id,
          title: r.title,
          severity: r.severity as Severity,
          bodyMd: r.bodyMd,
        }));
        try {
          const res = await callLlmJsonLogged(
            {
              purpose: "pr_map",
              system: MAP_SYSTEM,
              user: buildMapPrompt({ overview, file: file.filename, rules: rulesForPrompt, annotatedDiff: diff.text }),
              responseSchema: MAP_JSON_SCHEMA,
              temperature: 0.1,
              signal: AbortSignal.timeout(120_000),
            },
            (v) => validateMapOutput(v, validRuleIds),
            llmCtx
          );
          usage = addUsage(usage, res.usage);
          model = res.model;
          return { file, addedLines: diff.addedLines, out: res.value };
        } catch (e) {
          // One file failing must not kill the whole PR analysis.
          console.warn(`[pr] MAP failed for ${file.filename}: ${(e as Error).message}`);
          return null;
        }
      });

      for (const r of mapResults) {
        if (!r) continue;
        if (r.out.note) notes.push({ file: r.file.filename, note: r.out.note });
        for (const v of r.out.violations) {
          const repoRule = v.ruleId ? ruleById.get(v.ruleId) : undefined;
          findings.push({
            source: "custom",
            ruleId: null,
            repoRuleId: repoRule?.id ?? null,
            ruleName: repoRule?.title ?? v.ruleName,
            severity: v.severity,
            filePath: r.file.filename,
            lineStart: resolveFindingLine(v.lineStart, r.addedLines),
            message: v.explanation,
            suggestion: v.suggestedFix || null,
          });
        }
      }
    }

    if (notes.length === 0) {
      for (const f of analyzable.slice(0, 20)) notes.push({ file: f.filename, note: "changed" });
    }

    const deduped = dedupeFindings(findings);

    // ── REDUCE (summary + score) ──
    const ceiling = severityCeiling(deduped.map((f) => f.severity));
    let summary = "";
    let qualityReasoning = "";
    let qualityScore: number | null = null;

    if (analyzable.length === 0 && deduped.length === 0) {
      summary = "No analyzable changes in this PR.";
    } else {
      const violationsSummary = deduped
        .map((f) => `- [${f.source}] ${f.ruleName} (${f.severity}) ${f.filePath}${f.lineStart ? `:${f.lineStart}` : ""}`)
        .join("\n");
      try {
        const reduce = await callLlmJsonLogged(
          {
            purpose: "pr_reduce",
            system: REDUCE_SYSTEM,
            user: buildReducePrompt({ overview, prTitle: repo.fullName, prBody: null, notes, violationsSummary }),
            responseSchema: REDUCE_JSON_SCHEMA,
            temperature: 0.2,
          },
          validateReduceOutput,
          llmCtx
        );
        usage = addUsage(usage, reduce.usage);
        model = reduce.model;
        summary = reduce.value.summary;
        qualityScore = clampScore(reduce.value.qualityScore, ceiling);
        qualityReasoning = reduce.value.qualityReasoning;
        if (reduce.value.qualityScore > ceiling) {
          qualityReasoning += ` (Score capped at ${ceiling} by a ${ceiling === 2 ? "error" : "warning"}-level violation.)`;
        }
      } catch (e) {
        // Reduce failed → don't post garbage; record diagnostic but still save findings.
        summary = "Automated summary unavailable (analysis incomplete).";
        console.warn(`[pr] REDUCE failed: ${(e as Error).message}`);
      }
    }

    const runtimeMs = Date.now() - t0;
    const commentBody = renderPrComment({
      summary,
      qualityScore: qualityScore ?? ceiling,
      qualityReasoning,
      findings: deduped,
      commitSha,
      truncated: truncatedAny,
    });

    // ── Persist (idempotent on retry) ──
    const findingsByFile = new Map<string, number>();
    for (const f of deduped) findingsByFile.set(f.filePath, (findingsByFile.get(f.filePath) ?? 0) + 1);
    const diagnosticFiles = new Set(astResult.diagnostics.map((d) => d.file));
    const rulesEvaluated = ALL_RULES.filter((r) => config.rules[r.meta.id]?.enabled !== false).length;

    await prisma.$transaction([
      prisma.finding.deleteMany({ where: { prAnalysisId } }),
      prisma.changedFile.deleteMany({ where: { prAnalysisId } }),
      prisma.evaluationResult.deleteMany({ where: { prAnalysisId } }),
      prisma.analysisReport.deleteMany({ where: { prAnalysisId } }),
      prisma.finding.createMany({
        data: deduped.map((f) => ({
          prAnalysisId,
          ruleId: f.ruleId,
          repoRuleId: f.repoRuleId,
          source: f.source,
          ruleName: f.ruleName,
          severity: f.severity,
          filePath: f.filePath,
          lineStart: f.lineStart,
          message: f.message,
          suggestion: f.suggestion,
        })),
      }),
      prisma.changedFile.createMany({
        data: changedFiles.map((filePath) => ({
          prAnalysisId,
          filePath,
          status: diagnosticFiles.has(filePath) ? ("DIAGNOSTIC" as const) : ("ANALYZED" as const),
          findingsCount: findingsByFile.get(filePath) ?? 0,
        })),
      }),
      prisma.evaluationResult.create({
        data: {
          prAnalysisId,
          runtimeMs,
          filesAnalyzed: astResult.filesAnalyzed,
          filesSkipped: astResult.filesSkipped,
          rulesEvaluated,
          findingsCount: deduped.length,
          diagnosticsCount: astResult.diagnostics.length,
        },
      }),
      prisma.analysisReport.create({
        data: { prAnalysisId, content: commentBody, status: "PUBLISHED", publishedAt: new Date() },
      }),
    ]);

    // ── Post comment + check run (skip if a newer commit superseded this run) ──
    let commentId: string | null = null;
    const headSha = await getPrHeadSha(installationId, owner, name, prNumber);
    if (headSha && headSha !== commitSha) {
      logger.info(`PR head moved (${commitSha.slice(0, 7)} → ${headSha.slice(0, 7)}); skipping stale comment.`);
    } else {
      const id = await upsertPrComment(installationId, owner, name, prNumber, commentBody);
      commentId = String(id);

      // Check-run annotations are a paid-plan perk (plan 04).
      const subscription = await prisma.tenantSubscription.findUnique({
        where: { userId: repo.userId },
        include: { plan: true },
      });
      if (subscription?.plan.hasCheckAnnotations) {
        await publishCheckRun(installationId, owner, name, commitSha, deduped, Boolean(config.blocking));
      }
    }

    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        runtimeMs,
        summary,
        qualityScore,
        qualityReasoning,
        truncated: truncatedAny,
        commentId,
        model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        costUsd: usage.costUsd,
      },
    });

    // Monthly usage (quota — plan 05)
    const month = new Date().getFullYear() * 100 + (new Date().getMonth() + 1);
    await prisma.subscriptionUsage.upsert({
      where: { userId_month: { userId: repo.userId, month } },
      create: { userId: repo.userId, month, analysisCount: 1 },
      update: { analysisCount: { increment: 1 } },
    });
  } catch (err) {
    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: {
        status: "FAILED",
        diagnosticMessage: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

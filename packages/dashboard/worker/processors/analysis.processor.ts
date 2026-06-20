import type { Job } from "bullmq";
import type { AnalysisJob } from "../../src/types";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  analyze,
  GitHubChangedFileProvider,
  GitHubContentProvider,
  publishPrResults,
  renderMarkdown,
  getRuleById,
  ALL_RULES,
  DEFAULT_CONFIG,
  type AnalyzerConfig,
  type Finding,
  type Logger,
} from "github-pr-code-smell-detector";
import { getInstallationToken } from "../../src/lib/github-app";

const VERSION = "0.0.0";

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

/** Merge a repository's stored JSON config with analyzer defaults. */
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

function mapFinding(prAnalysisId: string, f: Finding) {
  return {
    prAnalysisId,
    ruleId: f.ruleId,
    ruleName: getRuleById(f.ruleId)?.meta.title ?? f.ruleId,
    severity: f.severity,
    filePath: f.file,
    lineStart: f.range.start.line,
    lineEnd: f.range.end.line,
    columnStart: f.range.start.column,
    message: f.message,
    suggestion: f.suggestion ?? null,
  };
}

export async function analysisProcessor(job: Job<AnalysisJob>) {
  const { prAnalysisId, repoId, prNumber, commitSha, installationId } = job.data;
  const prisma = getPrisma();
  const t0 = Date.now();

  try {
    if (!installationId) throw new Error("Missing installationId — repository not connected via GitHub App");

    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repoId } });
    const [owner, name] = repo.fullName.split("/");
    const config = buildAnalyzerConfig(repo.config);

    const token = await getInstallationToken(installationId);
    const changedFileProvider = new GitHubChangedFileProvider(token, owner, name, prNumber);
    const contentProvider = new GitHubContentProvider(token, owner, name, commitSha);

    // Full changed-file list (for the Changed Files page).
    const changedFiles = await changedFileProvider.getChangedFiles();

    const result = await analyze({
      changedFileProvider,
      contentProvider,
      config,
      logger,
      repoPath: "",
    });

    const diagnosticFiles = new Set(result.diagnostics.map((d) => d.file));
    const findingsByFile = new Map<string, number>();
    for (const f of result.findings) {
      findingsByFile.set(f.file, (findingsByFile.get(f.file) ?? 0) + 1);
    }

    const rulesEvaluated = ALL_RULES.filter(
      (r) => config.rules[r.meta.id]?.enabled !== false
    ).length;
    const runtimeMs = Date.now() - t0;
    const markdown = renderMarkdown(result.findings, VERSION);

    // Persist atomically; idempotent on retry (clear prior rows first).
    await prisma.$transaction([
      prisma.finding.deleteMany({ where: { prAnalysisId } }),
      prisma.changedFile.deleteMany({ where: { prAnalysisId } }),
      prisma.evaluationResult.deleteMany({ where: { prAnalysisId } }),
      prisma.analysisReport.deleteMany({ where: { prAnalysisId } }),
      prisma.finding.createMany({ data: result.findings.map((f) => mapFinding(prAnalysisId, f)) }),
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
          filesAnalyzed: result.filesAnalyzed,
          filesSkipped: result.filesSkipped,
          rulesEvaluated,
          findingsCount: result.findings.length,
          diagnosticsCount: result.diagnostics.length,
        },
      }),
      prisma.analysisReport.create({
        data: { prAnalysisId, content: markdown, status: "PUBLISHED", publishedAt: new Date() },
      }),
    ]);

    // Publish to the PR — comment always, Check run only if the plan enables it.
    const subscription = await prisma.tenantSubscription.findUnique({
      where: { userId: repo.userId },
      include: { plan: true },
    });
    await publishPrResults({
      token,
      owner,
      repo: name,
      prNumber,
      sha: commitSha,
      findings: result.findings,
      blocking: Boolean(config.blocking),
      version: VERSION,
      logger,
      publishCheck: Boolean(subscription?.plan.hasCheckAnnotations),
    });

    await prisma.prAnalysis.update({
      where: { id: prAnalysisId },
      data: { status: "COMPLETED", completedAt: new Date(), runtimeMs },
    });

    // Increment monthly usage
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

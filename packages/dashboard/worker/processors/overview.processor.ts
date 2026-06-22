import type { Job } from "bullmq";
import { UnrecoverableError } from "bullmq";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { OverviewJob } from "../../src/types";
import {
  getBranchHeadSha,
  getRepoTree,
  getFileContentAtRef,
  listOpenPullRequests,
} from "../../src/lib/github-app";
import {
  selectIndexableFiles,
  defaultSelectOptions,
  type SelectableFile,
} from "../../src/lib/overview/file-filter";
import {
  clusterByDirectory,
  buildMapPrompt,
  MAP_SYSTEM,
  buildReducePrompt,
  REDUCE_SYSTEM,
  parseReduceOutput,
  mapWithConcurrency,
  type FileWithContent,
} from "../../src/lib/overview/prompts";
import { LlmError, type LlmUsage } from "../../src/lib/llm/openrouter";
import { callLlmLogged, callLlmJsonLogged, createLlmCallLogger } from "../../src/lib/llm/logged";
import { enqueueAnalysis } from "../../src/lib/queue";

const MAP_CONCURRENCY = Number(process.env.OVERVIEW_MAP_CONCURRENCY ?? 4);
const FETCH_CONCURRENCY = Number(process.env.OVERVIEW_FETCH_CONCURRENCY ?? 8);

// Basenames treated as manifests/high-signal for the REDUCE step.
const MANIFEST_NAMES = new Set([
  "package.json",
  "tsconfig.json",
  "readme.md",
  "readme",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "cargo.toml",
  "composer.json",
  "pom.xml",
  "schema.prisma",
]);

function getPrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

function addUsage(a: LlmUsage, b: LlmUsage): LlmUsage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    costUsd: a.costUsd + b.costUsd,
  };
}

function basename(path: string): string {
  const i = path.lastIndexOf("/");
  return (i >= 0 ? path.slice(i + 1) : path).toLowerCase();
}

export async function overviewProcessor(job: Job<OverviewJob>) {
  const { repositoryId, installationId } = job.data;
  const prisma = getPrisma();
  const attempts = job.opts.attempts ?? 1;
  const isLastAttempt = job.attemptsMade + 1 >= attempts;
  // Re-index of an already-built overview → keep it visible & repo READY on failure.
  let hadReadyOverview = false;

  try {
    if (!installationId) {
      throw new LlmError("Missing installationId — repository not connected via GitHub App", false);
    }

    const repo = await prisma.repository.findUniqueOrThrow({ where: { id: repositoryId } });
    const [owner, name] = repo.fullName.split("/");

    const sha = job.data.sha ?? (await getBranchHeadSha(installationId, owner, name, repo.defaultBranch));

    // Already current? Nothing to do (debounced push / duplicate enqueue).
    const current = await prisma.projectOverview.findUnique({ where: { repositoryId } });
    if (current?.status === "READY" && current.indexedSha === sha) {
      return { skipped: true, reason: "already indexed at sha" };
    }
    hadReadyOverview = current?.status === "READY" && Boolean(current.summaryMd);

    // Mark INDEXING but keep any previous summary visible until the new one is READY.
    await prisma.projectOverview.upsert({
      where: { repositoryId },
      create: { repositoryId, status: "INDEXING" },
      update: { status: "INDEXING", errorMessage: null },
    });

    // 1. git tree → 2. filter + cap
    const { entries, truncated } = await getRepoTree(installationId, owner, name, sha);
    const blobs: SelectableFile[] = entries
      .filter((e) => e.type === "blob")
      .map((e) => ({ path: e.path, size: e.size ?? 0 }));
    if (blobs.length === 0) {
      throw new LlmError("Repository tree has no files to index", false);
    }
    const selection = selectIndexableFiles(blobs, defaultSelectOptions());
    if (selection.selected.length === 0) {
      throw new LlmError("No indexable source files after filtering", false);
    }
    console.log(
      `[overview] ${repo.fullName}@${sha.slice(0, 7)}: ${selection.selected.length} files ` +
        `(${selection.droppedFiltered} filtered, ${selection.droppedCap} over cap${truncated ? ", tree truncated" : ""})`
    );

    // 3. fetch contents (bounded concurrency); skip unreadable/binary
    const fetched = await mapWithConcurrency(selection.selected, FETCH_CONCURRENCY, async (f) => {
      const content = await getFileContentAtRef(installationId, owner, name, f.path, sha);
      return content ? ({ path: f.path, content } as FileWithContent) : null;
    });
    const files = fetched.filter((f): f is FileWithContent => f !== null);
    if (files.length === 0) {
      throw new LlmError("Could not read any file contents", false);
    }

    let usage: LlmUsage = { promptTokens: 0, completionTokens: 0, costUsd: 0 };
    const llmCtx = { repositoryId, log: createLlmCallLogger(prisma, repositoryId) };

    // 4. MAP — summarize each directory cluster
    const clusters = clusterByDirectory(files);
    const clusterSummaries = await mapWithConcurrency(clusters, MAP_CONCURRENCY, async (cluster) => {
      const res = await callLlmLogged(
        {
          purpose: "overview_map",
          system: MAP_SYSTEM,
          user: buildMapPrompt(cluster),
          signal: AbortSignal.timeout(120_000),
        },
        llmCtx
      );
      usage = addUsage(usage, res.usage);
      return { dir: cluster.dir, summary: res.content };
    });

    // 5. REDUCE — synthesize the whole project
    const manifests = files.filter((f) => MANIFEST_NAMES.has(basename(f.path)));
    const reduce = await callLlmJsonLogged(
      {
        purpose: "overview_reduce",
        system: REDUCE_SYSTEM,
        user: buildReducePrompt(repo.fullName, clusterSummaries, manifests),
      },
      parseReduceOutput,
      llmCtx
    );
    usage = addUsage(usage, reduce.usage);

    // 6. persist READY
    await prisma.projectOverview.update({
      where: { repositoryId },
      data: {
        status: "READY",
        indexedSha: sha,
        summaryMd: reduce.value.summaryMd,
        metadata: reduce.value.metadata as object,
        filesScanned: files.length,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        costUsd: usage.costUsd,
        errorMessage: null,
      },
    });

    // Transition the repo to READY so PR analysis can run (plan 01). Re-index of
    // an already-READY repo is a no-op here (only INDEXING/DETECTING flip).
    await prisma.repository.updateMany({
      where: { id: repositoryId, connectionState: { in: ["INDEXING", "DETECTING"] } },
      data: { connectionState: "READY" },
    });

    // 7. backfill open PRs on the first successful index
    if (job.data.backfill) {
      await backfillOpenPrs(prisma, {
        repositoryId,
        installationId,
        owner,
        name,
        userId: repo.userId,
      });
    }

    return { ok: true, sha, files: files.length, costUsd: usage.costUsd };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const unrecoverable = err instanceof LlmError && !err.retryable;

    // Only act when we're done retrying (or the error is non-retryable).
    if (unrecoverable || isLastAttempt) {
      if (hadReadyOverview) {
        // Re-index failed but the old overview is still valid → restore READY so
        // the tab keeps showing it and the repo keeps analyzing PRs.
        await prisma.projectOverview
          .update({ where: { repositoryId }, data: { status: "READY", errorMessage: message } })
          .catch(() => {});
      } else {
        // First index failed → FAILED overview + INDEX_FAILED repo (plan 01).
        await prisma.projectOverview
          .upsert({
            where: { repositoryId },
            create: { repositoryId, status: "FAILED", errorMessage: message },
            update: { status: "FAILED", errorMessage: message },
          })
          .catch(() => {});
        await prisma.repository
          .updateMany({
            where: { id: repositoryId, connectionState: { in: ["INDEXING", "DETECTING"] } },
            data: { connectionState: "INDEX_FAILED" },
          })
          .catch(() => {});
      }
    }

    if (unrecoverable) throw new UnrecoverableError(message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

/** Enqueue PR analysis for every OPEN PR once the overview is ready (plan 02 step 6). */
async function backfillOpenPrs(
  prisma: PrismaClient,
  ctx: { repositoryId: string; installationId: number; owner: string; name: string; userId: string }
) {
  let openPrs;
  try {
    openPrs = await listOpenPullRequests(ctx.installationId, ctx.owner, ctx.name);
  } catch (e) {
    console.warn(`[overview] backfill list PRs failed: ${(e as Error).message}`);
    return;
  }

  for (const pr of openPrs) {
    const dbPr = await prisma.pullRequest.upsert({
      where: { repositoryId_prNumber: { repositoryId: ctx.repositoryId, prNumber: pr.number } },
      create: {
        repositoryId: ctx.repositoryId,
        prNumber: pr.number,
        title: pr.title,
        body: pr.body,
        state: "OPEN",
        author: pr.author,
        sourceBranch: pr.headRef,
        targetBranch: pr.baseRef,
        commitSha: pr.headSha,
        githubUrl: pr.htmlUrl,
      },
      update: { commitSha: pr.headSha, state: "OPEN" },
    });

    const analysis = await prisma.prAnalysis.create({
      data: { pullRequestId: dbPr.id, status: "PENDING", commitSha: pr.headSha },
    });

    await enqueueAnalysis(dbPr.id, {
      prAnalysisId: analysis.id,
      repoId: ctx.repositoryId,
      prNumber: pr.number,
      commitSha: pr.headSha,
      installationId: ctx.installationId,
    });
  }
  if (openPrs.length > 0) {
    console.log(`[overview] backfilled ${openPrs.length} open PR(s) for ${ctx.owner}/${ctx.name}`);
  }
}

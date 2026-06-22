import { Queue } from "bullmq";
import type { AnalysisJob, OverviewJob } from "@/types";
import { redisConnection } from "./redis";

export const analysisQueue = new Queue<AnalysisJob>("analysis", {
  connection: redisConnection(),
});

export const overviewQueue = new Queue<OverviewJob>("overview", {
  connection: redisConnection(),
});

/** Stable analysis job id per PR so rapid pushes debounce to the newest commit. */
export function analysisJobId(pullRequestId: string): string {
  return `analysis:${pullRequestId}`;
}

/**
 * Enqueue PR analysis with a stable per-PR jobId (plan 04 debounce): a newer
 * push supersedes a still-pending job so only the latest commit is analyzed.
 * A small delay collapses bursts. The processor still re-checks the head SHA
 * before posting, covering jobs that were already running.
 */
export async function enqueueAnalysis(
  pullRequestId: string,
  job: AnalysisJob,
  opts: { delayMs?: number } = {}
): Promise<void> {
  const jobId = analysisJobId(pullRequestId);
  const existing = await analysisQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === "delayed" || state === "waiting" || state === "completed" || state === "failed") {
      await existing.remove().catch(() => {});
    }
  }
  await analysisQueue.add("analyze-pr", job, {
    jobId,
    delay: opts.delayMs ?? Number(process.env.PR_DEBOUNCE_MS ?? 10_000),
    attempts: 2,
    backoff: { type: "exponential", delay: 15_000 },
    removeOnComplete: true,
    removeOnFail: 50,
  });
}

/** Stable job id per repo so rapid pushes debounce to one queued re-index. */
export function overviewJobId(repositoryId: string): string {
  return `overview:${repositoryId}`;
}

/**
 * Enqueue an overview index/re-index. Auto-retry with backoff handles transient
 * failures on the first index (plan 02). `delayMs` debounces bursty pushes — we
 * remove any still-pending job first so the newest SHA supersedes it (a stable
 * jobId alone would otherwise make the second enqueue a no-op).
 */
export async function enqueueOverview(
  job: OverviewJob,
  opts: { delayMs?: number } = {}
): Promise<void> {
  const jobId = overviewJobId(job.repositoryId);
  const existing = await overviewQueue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === "delayed" || state === "waiting" || state === "completed" || state === "failed") {
      await existing.remove().catch(() => {});
    }
  }
  await overviewQueue.add("index-overview", job, {
    jobId,
    delay: opts.delayMs ?? 0,
    attempts: 3,
    backoff: { type: "exponential", delay: 30_000 }, // 30s, 60s
    removeOnComplete: true,
    removeOnFail: 50,
  });
}

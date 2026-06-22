import "dotenv/config";
import { Worker } from "bullmq";
import { analysisProcessor } from "./processors/analysis.processor";
import { overviewProcessor } from "./processors/overview.processor";
import { redisConnection } from "../src/lib/redis";
import type { AnalysisJob, OverviewJob } from "../src/types";

const analysisWorker = new Worker<AnalysisJob>("analysis", analysisProcessor, {
  connection: redisConnection(),
});

const overviewWorker = new Worker<OverviewJob>("overview", overviewProcessor, {
  connection: redisConnection(),
});

for (const [label, worker] of [
  ["Analysis", analysisWorker],
  ["Overview", overviewWorker],
] as const) {
  worker.on("completed", (job) => {
    console.log(`${label} job ${job.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`${label} job ${job?.id} failed:`, err?.message);
  });
  // BullMQ emits "error" on connection problems (e.g. Redis down). Without a
  // listener Node treats it as an unhandled "error" event and aborts the process
  // (exit code 134). Log it instead so a transient blip doesn't kill the worker.
  worker.on("error", (err) => {
    console.error(`[${label.toLowerCase()} worker] connection error:`, err.message);
  });
}

console.log("Workers started (analysis + overview), listening for jobs…");

// Graceful shutdown so Ctrl-C / SIGTERM closes the Redis connection cleanly.
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await Promise.all([analysisWorker.close(), overviewWorker.close()]);
    process.exit(0);
  });
}

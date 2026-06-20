import "dotenv/config";
import { Worker } from "bullmq";
import { analysisProcessor } from "./processors/analysis.processor";
import { redisConnection } from "../src/lib/redis";
import type { AnalysisJob } from "../src/types";

const worker = new Worker<AnalysisJob>("analysis", analysisProcessor, {
  connection: redisConnection(),
});

worker.on("completed", (job) => {
  console.log(`Analysis job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Analysis job ${job?.id} failed:`, err.message);
});

// BullMQ emits "error" on connection problems (e.g. Redis down). Without a
// listener Node treats it as an unhandled "error" event and aborts the process
// (exit code 134). Log it instead so a transient blip doesn't kill the worker.
worker.on("error", (err) => {
  console.error("[worker] connection error:", err.message);
});

console.log("Analysis worker started, listening for jobs…");

// Graceful shutdown so Ctrl-C / SIGTERM closes the Redis connection cleanly.
for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, async () => {
    await worker.close();
    process.exit(0);
  });
}

import { Worker } from "bullmq";
import { analysisProcessor } from "./processors/analysis.processor";
import type { AnalysisJob } from "../src/types";

const connection = {
  host: process.env.REDIS_URL?.replace(/^redis:\/\/[^@]+@/, "").split(":")[0] ?? "localhost",
  port: parseInt(
    process.env.REDIS_URL?.replace(/^redis:\/\/[^@]+@/, "").split(":")[1] ?? "6379"
  ),
};

const worker = new Worker<AnalysisJob>("analysis", analysisProcessor, { connection });

worker.on("completed", (job) => {
  console.log(`Analysis job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Analysis job ${job?.id} failed:`, err.message);
});

console.log("Analysis worker started, listening for jobs…");

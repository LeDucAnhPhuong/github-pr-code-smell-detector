import { Queue } from "bullmq";
import type { AnalysisJob } from "@/types";

const connection = {
  host: process.env.REDIS_URL?.replace(/^redis:\/\/[^@]+@/, "").split(":")[0] ?? "localhost",
  port: parseInt(
    process.env.REDIS_URL?.replace(/^redis:\/\/[^@]+@/, "").split(":")[1] ?? "6379"
  ),
};

export const analysisQueue = new Queue<AnalysisJob>("analysis", { connection });

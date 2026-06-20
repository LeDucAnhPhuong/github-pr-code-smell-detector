import { Queue } from "bullmq";
import type { AnalysisJob } from "@/types";
import { redisConnection } from "./redis";

export const analysisQueue = new Queue<AnalysisJob>("analysis", {
  connection: redisConnection(),
});

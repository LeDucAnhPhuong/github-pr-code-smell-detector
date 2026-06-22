-- Token budget per subscription (plan 09). Additive + backward-compatible.

-- SubscriptionPlan: monthly LLM token budget (0 = unlimited)
ALTER TABLE "SubscriptionPlan" ADD COLUMN "tokenQuota" INTEGER NOT NULL DEFAULT 0;

-- SubscriptionUsage: monthly token usage + cost (cost is observability only)
ALTER TABLE "SubscriptionUsage" ADD COLUMN "tokenUsed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionUsage" ADD COLUMN "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- LlmCallLog: owner user for per-user aggregation
ALTER TABLE "LlmCallLog" ADD COLUMN "userId" TEXT;
CREATE INDEX "LlmCallLog_userId_idx" ON "LlmCallLog"("userId");

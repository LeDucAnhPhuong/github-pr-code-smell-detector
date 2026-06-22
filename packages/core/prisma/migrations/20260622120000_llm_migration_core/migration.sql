-- LLM migration core schema (plans 01/03/04/05/06). Additive + backward-compatible.

-- CreateEnum
CREATE TYPE "RepoConnectionState" AS ENUM ('DETECTING', 'REJECTED', 'INDEXING', 'READY', 'INDEX_FAILED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RuleSource" AS ENUM ('system', 'custom');

-- AlterTable: Repository — connect flow (plan 01)
ALTER TABLE "Repository" ADD COLUMN "connectionState" "RepoConnectionState" NOT NULL DEFAULT 'DETECTING';
ALTER TABLE "Repository" ADD COLUMN "frameworkId" TEXT;
ALTER TABLE "Repository" ADD COLUMN "consentedAt" TIMESTAMP(3);
ALTER TABLE "Repository" ADD COLUMN "rejectedReason" TEXT;
-- Existing repos were auto-connected under the old flow → treat them as READY so
-- their PR events keep being analyzed (new repos start DETECTING via the default).
UPDATE "Repository" SET "connectionState" = 'READY';

-- AlterTable: PrAnalysis — PR analysis results (plan 04)
ALTER TABLE "PrAnalysis" ADD COLUMN "summary" TEXT;
ALTER TABLE "PrAnalysis" ADD COLUMN "qualityScore" INTEGER;
ALTER TABLE "PrAnalysis" ADD COLUMN "qualityReasoning" TEXT;
ALTER TABLE "PrAnalysis" ADD COLUMN "truncated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PrAnalysis" ADD COLUMN "commentId" TEXT;
ALTER TABLE "PrAnalysis" ADD COLUMN "model" TEXT;
ALTER TABLE "PrAnalysis" ADD COLUMN "promptTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PrAnalysis" ADD COLUMN "completionTokens" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PrAnalysis" ADD COLUMN "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- AlterTable: Finding — system vs custom + file-level findings (plan 04)
ALTER TABLE "Finding" ADD COLUMN "repoRuleId" TEXT;
ALTER TABLE "Finding" ADD COLUMN "source" "RuleSource" NOT NULL DEFAULT 'system';
ALTER TABLE "Finding" ALTER COLUMN "ruleId" DROP NOT NULL;
ALTER TABLE "Finding" ALTER COLUMN "lineStart" DROP NOT NULL;

-- CreateTable: RepoRule (plan 03)
CREATE TABLE "RepoRule" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'warning',
    "appliesTo" TEXT[],
    "bodyMd" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepoRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepoRule_repositoryId_idx" ON "RepoRule"("repositoryId");

-- CreateTable: LlmCallLog (plan 05)
CREATE TABLE "LlmCallLog" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "latencyMs" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmCallLog_repositoryId_idx" ON "LlmCallLog"("repositoryId");
CREATE INDEX "LlmCallLog_purpose_idx" ON "LlmCallLog"("purpose");

-- CreateIndex
CREATE INDEX "Finding_repoRuleId_idx" ON "Finding"("repoRuleId");

-- AddForeignKey
ALTER TABLE "RepoRule" ADD CONSTRAINT "RepoRule_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_repoRuleId_fkey" FOREIGN KEY ("repoRuleId") REFERENCES "RepoRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

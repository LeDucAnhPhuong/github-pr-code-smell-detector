-- CreateEnum
CREATE TYPE "OverviewStatus" AS ENUM ('PENDING', 'INDEXING', 'READY', 'FAILED');

-- CreateTable
CREATE TABLE "ProjectOverview" (
    "id" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "status" "OverviewStatus" NOT NULL DEFAULT 'PENDING',
    "indexedSha" TEXT,
    "summaryMd" TEXT,
    "metadata" JSONB,
    "filesScanned" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectOverview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectOverview_repositoryId_key" ON "ProjectOverview"("repositoryId");

-- AddForeignKey
ALTER TABLE "ProjectOverview" ADD CONSTRAINT "ProjectOverview_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

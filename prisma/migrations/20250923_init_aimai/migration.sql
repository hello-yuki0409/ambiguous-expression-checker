-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "aimai";

-- CreateEnum
CREATE TYPE "aimai"."AimaiCategory" AS ENUM ('HEDGING', 'VAGUE', 'QUANTITY', 'RESPONSIBILITY', 'OTHER');

-- CreateTable
CREATE TABLE "aimai"."User" (
    "id" VARCHAR(128) NOT NULL,
    "authorLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aimai"."Article" (
    "id" TEXT NOT NULL,
    "authorId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aimai"."article_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aimai"."check_runs" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "dictionaryId" TEXT,
    "aimaiScore" DOUBLE PRECISION NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "charLength" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "check_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aimai"."findings" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "matchedText" TEXT NOT NULL,
    "category" "aimai"."AimaiCategory" NOT NULL,
    "severity" INTEGER NOT NULL,
    "reason" TEXT,
    "patternId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aimai"."aimai_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regex" TEXT NOT NULL,
    "flags" TEXT,
    "category" "aimai"."AimaiCategory" NOT NULL,
    "severity" INTEGER NOT NULL,
    "explanation" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "aimai_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_versions_created_at_idx" ON "aimai"."article_versions"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "article_versions_article_index_key" ON "aimai"."article_versions"("articleId", "index");

-- CreateIndex
CREATE INDEX "check_runs_created_at_idx" ON "aimai"."check_runs"("createdAt");

-- CreateIndex
CREATE INDEX "findings_run_id_idx" ON "aimai"."findings"("runId");

-- AddForeignKey
ALTER TABLE "aimai"."Article" ADD CONSTRAINT "Article_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "aimai"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aimai"."article_versions" ADD CONSTRAINT "article_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "aimai"."Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aimai"."check_runs" ADD CONSTRAINT "check_runs_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "aimai"."article_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aimai"."findings" ADD CONSTRAINT "findings_runId_fkey" FOREIGN KEY ("runId") REFERENCES "aimai"."check_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('openai', 'anthropic', 'deepseek', 'custom');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('pending', 'reviewing', 'passed', 'rejected', 'error');

-- CreateEnum
CREATE TYPE "TriggerSource" AS ENUM ('github_webhook', 'gitlab_ci', 'manual', 'api');

-- CreateTable
CREATE TABLE "GithubSettings" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "ignoredPaths" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GithubSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSettings" (
    "id" SERIAL NOT NULL,
    "provider" "AiProvider" NOT NULL DEFAULT 'anthropic',
    "apiKey" TEXT,
    "model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "baseUrl" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "systemPrompt" TEXT,
    "customName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSettings" (
    "id" SERIAL NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "onReviewPassed" BOOLEAN NOT NULL DEFAULT true,
    "onReviewFailed" BOOLEAN NOT NULL DEFAULT true,
    "onReviewError" BOOLEAN NOT NULL DEFAULT true,
    "onNewPending" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'github',
    "webhookId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PullRequest" (
    "id" SERIAL NOT NULL,
    "repositoryId" INTEGER NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "sourceBranch" TEXT NOT NULL,
    "targetBranch" TEXT NOT NULL,
    "prUrl" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'pending',
    "score" INTEGER,
    "triggerSource" "TriggerSource" NOT NULL DEFAULT 'github_webhook',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardSnapshot" (
    "id" SERIAL NOT NULL,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "monthlyReviews" INTEGER NOT NULL DEFAULT 0,
    "passRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "repoCount" INTEGER NOT NULL DEFAULT 0,
    "scoreExcellent" INTEGER NOT NULL DEFAULT 0,
    "scoreGood" INTEGER NOT NULL DEFAULT 0,
    "scoreFair" INTEGER NOT NULL DEFAULT 0,
    "scorePoor" INTEGER NOT NULL DEFAULT 0,
    "triggerWebhook" INTEGER NOT NULL DEFAULT 0,
    "triggerGitlabCi" INTEGER NOT NULL DEFAULT 0,
    "triggerManual" INTEGER NOT NULL DEFAULT 0,
    "triggerApi" INTEGER NOT NULL DEFAULT 0,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "pullRequestId" INTEGER NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "aiModel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "score" INTEGER,
    "status" "ReviewStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Repository_fullName_key" ON "Repository"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "PullRequest_repositoryId_prNumber_key" ON "PullRequest"("repositoryId", "prNumber");

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

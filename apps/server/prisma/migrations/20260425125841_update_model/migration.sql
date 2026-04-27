/*
  Warnings:

  - Added the required column `webhookUrl` to the `GithubSettings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GithubSettings" ADD COLUMN     "webhookUrl" TEXT NOT NULL;

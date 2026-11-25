-- skill-manage 库结构（与 packages/prisma/schema.prisma 对应）
-- 全部建在默认 schema（public），不单独建 schema。
-- 由容器启动脚本 init.mjs 在首次启动时执行；幂等：users 表已存在时跳过。

DO $do$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

DO $do$ BEGIN
  CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'RESIGNED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $do$;

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "token" TEXT,
    "tokenExpiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_sets" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_sets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "summary" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "icon" TEXT,
    "latestVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_set_skills" (
    "id" TEXT NOT NULL,
    "skillSetId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_set_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_versions" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalSize" BIGINT NOT NULL DEFAULT 0,
    "changelog" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_download_links" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "createdBy" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_download_links_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "skill_files" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "contentType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_account_key" ON "users"("account");
CREATE UNIQUE INDEX "users_token_key" ON "users"("token");
CREATE INDEX "skill_sets_ownerId_idx" ON "skill_sets"("ownerId");
CREATE UNIQUE INDEX "skill_sets_ownerId_slug_key" ON "skill_sets"("ownerId", "slug");
CREATE UNIQUE INDEX "skills_latestVersionId_key" ON "skills"("latestVersionId");
CREATE INDEX "skills_ownerId_idx" ON "skills"("ownerId");
CREATE UNIQUE INDEX "skills_ownerId_slug_key" ON "skills"("ownerId", "slug");
CREATE INDEX "skill_set_skills_skillId_idx" ON "skill_set_skills"("skillId");
CREATE UNIQUE INDEX "skill_set_skills_skillSetId_skillId_key" ON "skill_set_skills"("skillSetId", "skillId");
CREATE INDEX "skill_versions_skillId_idx" ON "skill_versions"("skillId");
CREATE UNIQUE INDEX "skill_versions_skillId_version_key" ON "skill_versions"("skillId", "version");
CREATE UNIQUE INDEX "skill_download_links_token_key" ON "skill_download_links"("token");
CREATE INDEX "skill_download_links_expiresAt_idx" ON "skill_download_links"("expiresAt");
CREATE INDEX "skill_download_links_versionId_idx" ON "skill_download_links"("versionId");
CREATE INDEX "skill_files_versionId_idx" ON "skill_files"("versionId");
CREATE UNIQUE INDEX "skill_files_versionId_filePath_key" ON "skill_files"("versionId", "filePath");

ALTER TABLE "skills" ADD CONSTRAINT "skills_latestVersionId_fkey" FOREIGN KEY ("latestVersionId") REFERENCES "skill_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "skill_set_skills" ADD CONSTRAINT "skill_set_skills_skillSetId_fkey" FOREIGN KEY ("skillSetId") REFERENCES "skill_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_set_skills" ADD CONSTRAINT "skill_set_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_download_links" ADD CONSTRAINT "skill_download_links_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "skill_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "skill_files" ADD CONSTRAINT "skill_files_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "skill_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

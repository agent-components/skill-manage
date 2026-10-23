import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";
import { normalizeTags } from "@/lib/skill-metadata";
import { deleteObjects } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: auth.user.id },
    include: {
      versions: { orderBy: { createdAt: "desc" } },
      projects: { include: { project: true } },
      latestVersion: true,
    },
  });
  if (!skill) return jsonError("技能不存在", 404);

  return jsonOk({
    id: skill.id,
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    tags: skill.tags,
    latestVersion: skill.latestVersion?.version ?? null,
    versions: skill.versions.map((v) => ({
      id: v.id,
      version: v.version,
      fileCount: v.fileCount,
      totalSize: v.totalSize.toString(),
      changelog: v.changelog,
      metadata: v.metadata,
      createdAt: v.createdAt,
    })),
    metadata: skill.latestVersion?.metadata ?? null,
    projects: skill.projects.map((p) => ({
      id: p.project.id,
      name: p.project.name,
      slug: p.project.slug,
    })),
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: auth.user.id },
  });
  if (!skill) return jsonError("技能不存在", 404);

  let body: {
    displayName?: string;
    summary?: string | null;
    tags?: unknown;
    projectIds?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  if (Array.isArray(body.projectIds)) {
    const owned = await prisma.project.count({
      where: { ownerId: auth.user.id, id: { in: body.projectIds } },
    });
    if (owned !== body.projectIds.length) {
      return jsonError("存在无权使用的项目", 403);
    }

    await prisma.$transaction([
      prisma.projectSkill.deleteMany({ where: { skillId: id } }),
      prisma.projectSkill.createMany({
        data: body.projectIds.map((projectId) => ({ projectId, skillId: id })),
        skipDuplicates: true,
      }),
    ]);
  }

  const updated = await prisma.skill.update({
    where: { id },
    data: {
      ...(typeof body.displayName === "string" && body.displayName.trim()
        ? { displayName: body.displayName.trim() }
        : {}),
      ...(body.summary !== undefined
        ? {
            summary:
              typeof body.summary === "string"
                ? body.summary.trim() || null
                : null,
          }
        : {}),
      ...(body.tags !== undefined ? { tags: normalizeTags(body.tags) } : {}),
    },
    include: {
      projects: { include: { project: true } },
      latestVersion: true,
    },
  });

  return jsonOk({
    id: updated.id,
    slug: updated.slug,
    displayName: updated.displayName,
    summary: updated.summary,
    tags: updated.tags,
    latestVersion: updated.latestVersion?.version ?? null,
    projects: updated.projects.map((p) => ({
      id: p.project.id,
      name: p.project.name,
      slug: p.project.slug,
    })),
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: auth.user.id },
    include: {
      versions: { include: { files: true } },
    },
  });
  if (!skill) return jsonError("技能不存在", 404);

  const keys: string[] = [];
  for (const v of skill.versions) {
    keys.push(v.storageKey);
    for (const f of v.files) keys.push(f.storageKey);
  }

  // Clear latestVersion FK first
  await prisma.skill.update({
    where: { id },
    data: { latestVersionId: null },
  });
  await prisma.skill.delete({ where: { id } });

  try {
    await deleteObjects(keys);
  } catch (e) {
    console.error("cleanup storage failed", e);
  }

  return jsonOk({ ok: true });
}

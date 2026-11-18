import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  jsonError,
  jsonOk,
  rejectSkillOutsideSkillSet,
  requireAuth,
} from "@/lib/api";
import { normalizeIcon } from "@/lib/icon";
import { normalizeTags } from "@/lib/skill-metadata";
import { deleteObjects } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const denied = await rejectSkillOutsideSkillSet(auth, id);
  if (denied) return denied;

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
    ...(auth.via === "session" ? { icon: skill.icon } : {}),
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
    skillSets: skill.projects.map((link) => ({
      id: link.project.id,
      name: link.project.name,
      slug: link.project.slug,
    })),
    createdAt: skill.createdAt,
    updatedAt: skill.updatedAt,
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const denied = await rejectSkillOutsideSkillSet(auth, id);
  if (denied) return denied;

  const skill = await prisma.skill.findFirst({
    where: { id, ownerId: auth.user.id },
  });
  if (!skill) return jsonError("技能不存在", 404);

  let body: {
    displayName?: string;
    summary?: string | null;
    tags?: unknown;
    skillSetIds?: string[];
    icon?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  let icon: string | null | undefined;
  if (auth.via === "session" && body.icon !== undefined) {
    try {
      icon = normalizeIcon(body.icon) ?? null;
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "图标无效");
    }
  }

  if (Array.isArray(body.skillSetIds)) {
    if (auth.skillSetId) {
      const onlyBound =
        body.skillSetIds.length === 1 && body.skillSetIds[0] === auth.skillSetId;
      if (!onlyBound) {
        return jsonError("令牌只能将技能关联到绑定技能集", 403);
      }
    }
    const owned = await prisma.project.count({
      where: { ownerId: auth.user.id, id: { in: body.skillSetIds } },
    });
    if (owned !== body.skillSetIds.length) {
      return jsonError("存在无权使用的技能集", 403);
    }

    await prisma.$transaction([
      prisma.projectSkill.deleteMany({ where: { skillId: id } }),
      prisma.projectSkill.createMany({
        data: body.skillSetIds.map((skillSetId) => ({
          projectId: skillSetId,
          skillId: id,
        })),
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
      ...(icon !== undefined ? { icon } : {}),
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
    ...(auth.via === "session" ? { icon: updated.icon } : {}),
    latestVersion: updated.latestVersion?.version ?? null,
    skillSets: updated.projects.map((link) => ({
      id: link.project.id,
      name: link.project.name,
      slug: link.project.slug,
    })),
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const denied = await rejectSkillOutsideSkillSet(auth, id);
  if (denied) return denied;

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

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, rejectOutsideSkillSet, requireAuth } from "@/lib/api";
import { normalizeIcon } from "@/lib/icon";
import { slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedSkillSet(ownerId: string, id: string) {
  return prisma.project.findFirst({ where: { id, ownerId } });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const denied = rejectOutsideSkillSet(auth, id);
  if (denied) return denied;

  const skillSet = await prisma.project.findFirst({
    where: { id, ownerId: auth.user.id },
    include: {
      skills: {
        include: {
          skill: {
            include: {
              latestVersion: true,
              _count: { select: { versions: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!skillSet) return jsonError("技能集不存在", 404);

  return jsonOk({
    id: skillSet.id,
    name: skillSet.name,
    slug: skillSet.slug,
    description: skillSet.description,
    icon: skillSet.icon,
    createdAt: skillSet.createdAt,
    updatedAt: skillSet.updatedAt,
    skills: skillSet.skills.map((ps) => ({
      id: ps.skill.id,
      slug: ps.skill.slug,
      displayName: ps.skill.displayName,
      summary: ps.skill.summary,
      ...(auth.via === "session" ? { icon: ps.skill.icon } : {}),
      latestVersion: ps.skill.latestVersion?.version ?? null,
      versionCount: ps.skill._count.versions,
      linkedAt: ps.createdAt,
    })),
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const denied = rejectOutsideSkillSet(auth, id);
  if (denied) return denied;

  const skillSet = await getOwnedSkillSet(auth.user.id, id);
  if (!skillSet) return jsonError("技能集不存在", 404);

  let body: {
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  const data: {
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
  } = {};

  if (body.icon !== undefined) {
    try {
      data.icon = normalizeIcon(body.icon) ?? null;
    } catch (e) {
      return jsonError(e instanceof Error ? e.message : "图标无效");
    }
  }

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    data.slug = slugify(body.slug);
  } else if (data.name) {
    data.slug = slugify(data.name);
  }
  if (body.description !== undefined) {
    data.description =
      typeof body.description === "string" ? body.description.trim() || null : null;
  }

  if (data.slug && data.slug !== skillSet.slug) {
    const clash = await prisma.project.findUnique({
      where: { ownerId_slug: { ownerId: auth.user.id, slug: data.slug } },
    });
    if (clash) return jsonError("技能集标识已存在", 409);
  }

  const updated = await prisma.project.update({
    where: { id },
    data,
  });
  return jsonOk(updated);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;
  const denied = rejectOutsideSkillSet(auth, id);
  if (denied) return denied;

  const skillSet = await getOwnedSkillSet(auth.user.id, id);
  if (!skillSet) return jsonError("技能集不存在", 404);

  // 只删技能集和关联引用（技能挂载、令牌），技能实体与版本文件保留。
  await prisma.$transaction([
    prisma.projectSkill.deleteMany({ where: { projectId: id } }),
    prisma.apiKey.deleteMany({ where: { projectId: id } }),
    prisma.project.delete({ where: { id } }),
  ]);
  return jsonOk({ ok: true });
}

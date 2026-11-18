import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, rejectOutsideSkillSet, requireAuth } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id: skillSetId } = await ctx.params;
  const denied = rejectOutsideSkillSet(auth, skillSetId);
  if (denied) return denied;

  const skillSet = await prisma.project.findFirst({
    where: { id: skillSetId, ownerId: auth.user.id },
  });
  if (!skillSet) return jsonError("技能集不存在", 404);

  let body: { add?: string[]; remove?: string[] };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  const add = Array.isArray(body.add) ? body.add : [];
  const remove = Array.isArray(body.remove) ? body.remove : [];

  if (add.length > 0) {
    const owned = await prisma.skill.findMany({
      where: { ownerId: auth.user.id, id: { in: add } },
      select: { id: true },
    });
    if (owned.length !== add.length) {
      return jsonError("存在无权关联的技能", 403);
    }
    await prisma.projectSkill.createMany({
      data: owned.map((s) => ({ projectId: skillSetId, skillId: s.id })),
      skipDuplicates: true,
    });
  }

  if (remove.length > 0) {
    await prisma.projectSkill.deleteMany({
      where: { projectId: skillSetId, skillId: { in: remove } },
    });
  }

  const skills = await prisma.projectSkill.findMany({
    where: { projectId: skillSetId },
    include: { skill: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk({
    skills: skills.map((ps) => ({
      id: ps.skill.id,
      slug: ps.skill.slug,
      displayName: ps.skill.displayName,
      summary: ps.skill.summary,
    })),
  });
}

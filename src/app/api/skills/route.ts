import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name")?.trim();
  const skillSetId = searchParams.get("skillSetId")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );

  if (auth.skillSetId && skillSetId && auth.skillSetId !== skillSetId) {
    return jsonError("令牌无权访问该技能集", 403);
  }
  const scopedSkillSetId = auth.skillSetId || skillSetId || undefined;

  const where = {
    ownerId: auth.user.id,
    ...(name
      ? {
          OR: [
            { displayName: { contains: name, mode: "insensitive" as const } },
            { slug: { contains: name, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(scopedSkillSetId
      ? { projects: { some: { projectId: scopedSkillSetId } } }
      : {}),
  };

  const [total, list] = await Promise.all([
    prisma.skill.count({ where }),
    prisma.skill.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        latestVersion: true,
        projects: { include: { project: true } },
        _count: { select: { versions: true } },
      },
    }),
  ]);

  return jsonOk({
    list: list.map((s) => ({
      id: s.id,
      slug: s.slug,
      displayName: s.displayName,
      summary: s.summary,
      tags: s.tags,
      ...(auth.via === "session" ? { icon: s.icon } : {}),
      latestVersion: s.latestVersion?.version ?? null,
      versionCount: s._count.versions,
      skillSets: s.projects.map((link) => ({
        id: link.project.id,
        name: link.project.name,
        slug: link.project.slug,
      })),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    total,
  });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name")?.trim();
  const projectId = searchParams.get("projectId")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );

  if (auth.projectId && projectId && auth.projectId !== projectId) {
    return jsonError("令牌无权访问该项目", 403);
  }
  const scopedProjectId = auth.projectId || projectId || undefined;

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
    ...(scopedProjectId
      ? { projects: { some: { projectId: scopedProjectId } } }
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
      latestVersion: s.latestVersion?.version ?? null,
      versionCount: s._count.versions,
      projects: s.projects.map((p) => ({
        id: p.project.id,
        name: p.project.name,
        slug: p.project.slug,
      })),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    total,
  });
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";
import { slugify } from "@/lib/slug";

type Ctx = { params: Promise<{ id: string }> };

async function getOwnedProject(ownerId: string, id: string) {
  return prisma.project.findFirst({ where: { id, ownerId } });
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  const { id } = await ctx.params;

  const project = await prisma.project.findFirst({
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
  if (!project) return jsonError("项目不存在", 404);

  return jsonOk({
    id: project.id,
    name: project.name,
    slug: project.slug,
    description: project.description,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    skills: project.skills.map((ps) => ({
      id: ps.skill.id,
      slug: ps.skill.slug,
      displayName: ps.skill.displayName,
      summary: ps.skill.summary,
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

  const project = await getOwnedProject(auth.user.id, id);
  if (!project) return jsonError("项目不存在", 404);

  let body: { name?: string; slug?: string; description?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  const data: {
    name?: string;
    slug?: string;
    description?: string | null;
  } = {};

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

  if (data.slug && data.slug !== project.slug) {
    const clash = await prisma.project.findUnique({
      where: { ownerId_slug: { ownerId: auth.user.id, slug: data.slug } },
    });
    if (clash) return jsonError("项目 slug 已存在", 409);
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

  const project = await getOwnedProject(auth.user.id, id);
  if (!project) return jsonError("项目不存在", 404);

  await prisma.project.delete({ where: { id } });
  return jsonOk({ ok: true });
}

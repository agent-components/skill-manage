import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";
import { normalizeIcon } from "@/lib/icon";
import { slugify } from "@/lib/slug";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );

  const where = {
    ownerId: auth.user.id,
    ...(auth.skillSetId ? { id: auth.skillSetId } : {}),
    ...(name ? { name: { contains: name, mode: "insensitive" as const } } : {}),
  };

  const [total, list] = await Promise.all([
    prisma.project.count({ where }),
    prisma.project.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { skills: true } } },
    }),
  ]);

  return jsonOk({
    list: list.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      icon: p.icon,
      skillCount: p._count.skills,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    total,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;
  if (auth.skillSetId) {
    return jsonError("令牌无权创建技能集", 403);
  }

  let body: { name?: string; slug?: string; description?: string; icon?: string | null };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  let icon: string | null | undefined;
  try {
    icon = normalizeIcon(body.icon);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "图标无效");
  }

  const name = body.name?.trim();
  if (!name) return jsonError("请输入技能集名称");

  const slug = slugify(body.slug?.trim() || name);

  const existing = await prisma.project.findUnique({
    where: { ownerId_slug: { ownerId: auth.user.id, slug } },
  });
  if (existing) return jsonError("技能集标识已存在", 409);

  const skillSet = await prisma.project.create({
    data: {
      ownerId: auth.user.id,
      name,
      slug,
      description: body.description?.trim() || null,
      icon: icon ?? null,
    },
  });

  return jsonOk(skillSet, { status: 201 });
}

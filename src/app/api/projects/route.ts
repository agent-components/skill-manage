import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk, requireAuth } from "@/lib/api";
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
    ...(auth.projectId ? { id: auth.projectId } : {}),
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
  if (auth.projectId) {
    return jsonError("令牌无权创建项目", 403);
  }

  let body: { name?: string; slug?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  const name = body.name?.trim();
  if (!name) return jsonError("请输入项目名称");

  const slug = slugify(body.slug?.trim() || name);

  const existing = await prisma.project.findUnique({
    where: { ownerId_slug: { ownerId: auth.user.id, slug } },
  });
  if (existing) return jsonError("项目 slug 已存在", 409);

  const project = await prisma.project.create({
    data: {
      ownerId: auth.user.id,
      name,
      slug,
      description: body.description?.trim() || null,
    },
  });

  return jsonOk(project, { status: 201 });
}

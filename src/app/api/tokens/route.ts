import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { generateApiKey, maskApiKey } from "@/lib/api-key";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";
import { normalizeMcpTools, parseMcpToolsInput } from "@/lib/mcp-tools";

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  const { searchParams } = req.nextUrl;
  const name = searchParams.get("name")?.trim();
  const skillSetId = searchParams.get("skillSetId")?.trim();
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || 20)),
  );

  const where = {
    userId: auth.user.id,
    ...(name ? { name: { contains: name, mode: "insensitive" as const } } : {}),
    ...(skillSetId ? { projectId: skillSetId } : {}),
  };

  const [total, list] = await Promise.all([
    prisma.apiKey.count({ where }),
    prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        project: { select: { id: true, name: true, slug: true } },
      },
    }),
  ]);

  return jsonOk({
    list: list.map((item) => ({
      id: item.id,
      name: item.name,
      displayToken: maskApiKey(item.prefix),
      skillSet: item.project,
      tools: normalizeMcpTools(item.tools),
      lastUsedAt: item.lastUsedAt,
      createdAt: item.createdAt,
    })),
    total,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  let body: { name?: string; skillSetId?: string; tools?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  const name = body.name?.trim();
  if (!name) return jsonError("请输入令牌名称");
  if (name.length > 64) return jsonError("令牌名称不能超过 64 个字符");

  const skillSetId = body.skillSetId?.trim();
  if (!skillSetId) return jsonError("请选择绑定技能集");

  const toolsParsed = parseMcpToolsInput(body.tools);
  if (!toolsParsed.ok) return jsonError(toolsParsed.message);

  const skillSet = await prisma.project.findFirst({
    where: { id: skillSetId, ownerId: auth.user.id },
    select: { id: true, name: true, slug: true },
  });
  if (!skillSet) return jsonError("技能集不存在或无权使用", 403);

  const generated = generateApiKey();

  try {
    const created = await prisma.apiKey.create({
      data: {
        userId: auth.user.id,
        projectId: skillSet.id,
        name,
        token: generated.token,
        keyHash: generated.keyHash,
        prefix: generated.prefix,
        tools: toolsParsed.tools,
      },
      include: {
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    return jsonOk(
      {
        id: created.id,
        name: created.name,
        displayToken: maskApiKey(created.prefix),
        skillSet: created.project,
        tools: normalizeMcpTools(created.tools),
        createdAt: created.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(",")
        : String(error.meta?.target ?? "");
      if (target.includes("name")) return jsonError("令牌名称已存在", 409);
    }
    throw error;
  }
}

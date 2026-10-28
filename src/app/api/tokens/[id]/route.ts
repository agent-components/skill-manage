import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { maskApiKey } from "@/lib/api-key";
import { jsonError, jsonOk, requireSession } from "@/lib/api";
import { prisma } from "@/lib/db";
import { normalizeMcpTools, parseMcpToolsInput } from "@/lib/mcp-tools";

type Ctx = { params: Promise<{ id: string }> };

/** 复制用：返回完整令牌 */
export async function GET(req: NextRequest, ctx: Ctx) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: auth.user.id },
    select: { token: true },
  });
  if (!existing) return jsonError("令牌不存在", 404);

  return jsonOk({ token: existing.token });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return jsonError("令牌不存在", 404);

  let body: { name?: string; projectId?: string; tools?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError("请求格式错误");
  }

  const data: { name?: string; projectId?: string; tools?: string[] } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return jsonError("请输入令牌名称");
    if (name.length > 64) return jsonError("令牌名称不能超过 64 个字符");
    data.name = name;
  }

  if (typeof body.projectId === "string") {
    const projectId = body.projectId.trim();
    if (!projectId) return jsonError("请选择绑定项目");
    const project = await prisma.project.findFirst({
      where: { id: projectId, ownerId: auth.user.id },
      select: { id: true },
    });
    if (!project) return jsonError("项目不存在或无权使用", 403);
    data.projectId = project.id;
  }

  if (body.tools !== undefined) {
    const toolsParsed = parseMcpToolsInput(body.tools);
    if (!toolsParsed.ok) return jsonError(toolsParsed.message);
    data.tools = toolsParsed.tools;
  }

  if (!data.name && !data.projectId && !data.tools) {
    return jsonError("没有可更新的字段");
  }

  try {
    const updated = await prisma.apiKey.update({
      where: { id },
      data,
      include: {
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    return jsonOk({
      id: updated.id,
      name: updated.name,
      displayToken: maskApiKey(updated.prefix),
      project: updated.project,
      tools: normalizeMcpTools(updated.tools),
      lastUsedAt: updated.lastUsedAt,
      createdAt: updated.createdAt,
    });
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

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const auth = await requireSession(req);
  if (auth.error) return auth.error;

  const { id } = await ctx.params;
  const existing = await prisma.apiKey.findFirst({
    where: { id, userId: auth.user.id },
  });
  if (!existing) return jsonError("令牌不存在", 404);

  await prisma.apiKey.delete({ where: { id } });
  return jsonOk({ ok: true });
}

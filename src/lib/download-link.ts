import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

/** 默认 15 分钟；可用 DOWNLOAD_LINK_TTL_SECONDS 覆盖 */
export function downloadLinkTtlMs() {
  const raw = process.env.DOWNLOAD_LINK_TTL_SECONDS;
  const seconds = raw ? Number(raw) : 15 * 60;
  if (!Number.isFinite(seconds) || seconds <= 0) return 15 * 60 * 1000;
  return Math.floor(seconds * 1000);
}

export function createDownloadToken() {
  return randomBytes(18).toString("base64url");
}

export async function createSkillDownloadLink(params: {
  versionId: string;
  createdBy?: string | null;
  ttlMs?: number;
}) {
  const ttlMs = params.ttlMs ?? downloadLinkTtlMs();
  const expiresAt = new Date(Date.now() + ttlMs);
  const token = createDownloadToken();

  const link = await prisma.skillDownloadLink.create({
    data: {
      token,
      versionId: params.versionId,
      createdBy: params.createdBy ?? null,
      expiresAt,
    },
  });

  return link;
}

export async function resolveSkillDownloadLink(token: string) {
  const link = await prisma.skillDownloadLink.findUnique({
    where: { token },
    include: {
      version: {
        include: {
          skill: { select: { id: true, slug: true, ownerId: true } },
        },
      },
    },
  });
  if (!link) return { error: "链接不存在或已失效" as const, link: null };
  if (link.expiresAt.getTime() <= Date.now()) {
    // 惰性清理
    await prisma.skillDownloadLink
      .delete({ where: { id: link.id } })
      .catch(() => undefined);
    return { error: "链接已过期" as const, link: null };
  }
  return { error: null, link };
}

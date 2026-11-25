import { randomBytes } from "crypto";
import { config } from "../../config/env.js";
import { prisma } from "../../infra/prisma.js";

/** 下载短链有效期（毫秒），来自 DOWNLOAD_LINK_TTL_SECONDS。 */
export function downloadLinkTtlMs() {
  return config.downloadLinkTtlSeconds * 1000;
}

function createDownloadToken() {
  return randomBytes(18).toString("base64url");
}

/** 为某个技能版本签发匿名下载短链 token。 */
export async function createSkillDownloadLink(params: {
  versionId: string;
  createdBy?: string | null;
}) {
  const ttlMs = downloadLinkTtlMs();
  return prisma.skillDownloadLink.create({
    data: {
      token: createDownloadToken(),
      versionId: params.versionId,
      createdBy: params.createdBy ?? null,
      expiresAt: new Date(Date.now() + ttlMs),
    },
  });
}

/** 解析短链 token；过期链接惰性清理。 */
export async function resolveSkillDownloadLink(token: string) {
  const link = await prisma.skillDownloadLink.findUnique({
    where: { token },
    include: {
      version: {
        select: {
          version: true,
          storageKey: true,
          skill: { select: { slug: true } },
        },
      },
    },
  });
  if (!link) return { error: "链接不存在或已失效" as const, link: null };
  if (link.expiresAt.getTime() <= Date.now()) {
    await prisma.skillDownloadLink.delete({ where: { id: link.id } }).catch(() => undefined);
    return { error: "链接已过期" as const, link: null };
  }
  return { error: null, link };
}

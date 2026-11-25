import { createId } from "@paralleldrive/cuid2";
import type { Prisma } from "@skill-manage/prisma";
import {
  compareVersions,
  normalizeIcon,
  normalizeTags,
  parseSkillArchiveFilename,
  skillArchiveFilenameError,
  type IconEntry,
  type PageOutput,
  type SkillDetail,
  type SkillFileContent,
  type SkillListItem,
  type SkillSetRef,
  type SkillUploadResult,
  type SkillVersionFile,
} from "@skill-manage/shared";
import { prisma } from "../../infra/prisma.js";
import {
  deleteObjects,
  getObjectBuffer,
  packageFileKey,
  packageZipKey,
  putObject,
} from "../../infra/storage.js";
import { SkillError } from "../../shared/errors.js";
import { pageOffset, parsePage } from "../../shared/pagination.js";
import { friendlyUploadError } from "../../shared/upload-error.js";
import { PREVIEW_MAX_BYTES, isProbablyText, parseSkillZip } from "./skill.package.js";

function skillSetsOf(
  links: { skillSet: { id: string; name: string; slug: string } }[]
): SkillSetRef[] {
  return links.map((link) => ({
    id: link.skillSet.id,
    name: link.skillSet.name,
    slug: link.skillSet.slug,
  }));
}

function skillSetSlugsFromList(value: string[] | undefined) {
  if (!value?.length) return [];
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export async function listSkills(
  ownerId: string,
  input: { current?: number; pageSize?: number; name?: string },
  skillSetSlugs: string[] = []
): Promise<PageOutput<SkillListItem>> {
  const name = input.name?.trim();
  const slugs = skillSetSlugsFromList(skillSetSlugs);
  const { current, pageSize } = parsePage(input);
  const where = {
    ownerId,
    ...(name
      ? {
          OR: [
            { displayName: { contains: name, mode: "insensitive" as const } },
            { slug: { contains: name, mode: "insensitive" as const } },
            { summary: { contains: name, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(slugs.length
      ? {
          skillSets: {
            some: { skillSet: { ownerId, slug: { in: slugs } } },
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.skill.count({ where }),
    prisma.skill.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: pageOffset(current, pageSize),
      take: pageSize,
      select: {
        id: true,
        slug: true,
        displayName: true,
        summary: true,
        tags: true,
        icon: true,
        createdAt: true,
        updatedAt: true,
        latestVersion: { select: { version: true } },
        skillSets: { include: { skillSet: true } },
        _count: { select: { versions: true } },
      },
    }),
  ]);

  const list: SkillListItem[] = rows.map((skill) => ({
    id: skill.id,
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    tags: skill.tags,
    icon: skill.icon,
    latestVersion: skill.latestVersion?.version ?? null,
    versionCount: skill._count.versions,
    skillSets: skillSetsOf(skill.skillSets),
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  }));

  return { list, total };
}

export async function listSkillIcons(ownerId: string, ids: string[]): Promise<IconEntry[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
  if (unique.length === 0) return [];
  const rows = await prisma.skill.findMany({
    where: { ownerId, id: { in: unique } },
    select: { id: true, icon: true },
  });
  return rows.map((row) => ({ id: row.id, icon: row.icon }));
}

async function ownedSkillSets(ownerId: string, skillSetIds: string[]) {
  const unique = [...new Set(skillSetIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return unique;
  const owned = await prisma.skillSet.count({
    where: { ownerId, id: { in: unique } },
  });
  if (owned !== unique.length) throw new SkillError("存在无权使用的技能集", 403);
  return unique;
}

export async function updateSkill(ownerId: string, id: string, body: Record<string, unknown>) {
  const skill = await prisma.skill.findFirst({ where: { id, ownerId } });
  if (!skill) throw new SkillError("技能不存在", 404);

  let icon: string | null | undefined;
  if ("icon" in body) {
    try {
      icon = normalizeIcon(body.icon) ?? null;
    } catch (error) {
      throw new SkillError(error instanceof Error ? error.message : "图标无效");
    }
  }

  if (Array.isArray(body.skillSetIds)) {
    const ids = body.skillSetIds.filter((item): item is string => typeof item === "string");
    if (ids.length !== body.skillSetIds.length) {
      throw new SkillError("技能集参数无效");
    }
    const skillSetIds = await ownedSkillSets(ownerId, ids);
    await prisma.$transaction([
      prisma.skillSetSkill.deleteMany({ where: { skillId: id } }),
      prisma.skillSetSkill.createMany({
        data: skillSetIds.map((skillSetId) => ({ skillSetId, skillId: id })),
        skipDuplicates: true,
      }),
    ]);
  }

  const data: Prisma.SkillUpdateInput = {};
  if (typeof body.displayName === "string") {
    const displayName = body.displayName.trim();
    if (!displayName) throw new SkillError("请输入技能名称");
    data.displayName = displayName;
  }
  if ("summary" in body) {
    data.summary = typeof body.summary === "string" ? body.summary.trim() || null : null;
  }
  if ("tags" in body) data.tags = normalizeTags(body.tags);
  if (icon !== undefined) data.icon = icon;

  const updated = await prisma.skill.update({
    where: { id },
    data,
    include: {
      skillSets: { include: { skillSet: true } },
      latestVersion: { select: { version: true } },
    },
  });

  return {
    id: updated.id,
    slug: updated.slug,
    displayName: updated.displayName,
    summary: updated.summary,
    tags: updated.tags,
    icon: updated.icon,
    latestVersion: updated.latestVersion?.version ?? null,
    skillSets: skillSetsOf(updated.skillSets),
  };
}

export async function deleteSkill(ownerId: string, id: string) {
  const skill = await prisma.skill.findFirst({
    where: { id, ownerId },
    include: { versions: { include: { files: true } } },
  });
  if (!skill) throw new SkillError("技能不存在", 404);

  const keys: string[] = [];
  for (const version of skill.versions) {
    keys.push(version.storageKey);
    for (const file of version.files) keys.push(file.storageKey);
  }

  await prisma.skill.update({
    where: { id },
    data: { latestVersionId: null },
  });
  await prisma.skill.delete({ where: { id } });

  try {
    await deleteObjects(keys);
  } catch (error) {
    console.error("cleanup storage failed", error);
  }
}

function normalizeRequestedPath(value: string | null | undefined) {
  const requested = (value?.trim() || "SKILL.md").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!requested || requested.includes("..")) {
    throw new SkillError("非法路径");
  }
  return requested;
}

async function findFileInVersion(versionId: string, requestedPath: string) {
  const exact = await prisma.skillFile.findUnique({
    where: { versionId_filePath: { versionId, filePath: requestedPath } },
  });
  if (exact) return exact;
  if (requestedPath.toLowerCase() !== "skill.md") return null;

  const files = await prisma.skillFile.findMany({ where: { versionId } });
  return files.find((file) => file.filePath.toLowerCase() === "skill.md") ?? null;
}

/** 只读最新版本。path 缺省为 SKILL.md，不接受历史版本。 */
export async function readSkillFile(ownerId: string, id: string, path: string | null) {
  const requestedPath = normalizeRequestedPath(path);
  const skill = await prisma.skill.findFirst({
    where: { id, ownerId },
    include: { latestVersion: { select: { id: true, version: true } } },
  });
  if (!skill) throw new SkillError("技能不存在", 404);
  if (!skill.latestVersion) throw new SkillError("技能尚无版本", 404);

  const file = await findFileInVersion(skill.latestVersion.id, requestedPath);
  if (!file) {
    throw new SkillError(
      `文件不存在: ${skill.slug}@${skill.latestVersion.version}/${requestedPath}`,
      404
    );
  }

  const size = Number(file.fileSize);
  if (!isProbablyText(file.filePath, file.contentType)) {
    throw new SkillError(`文件为二进制，无法以文本返回（${file.filePath}，${size} bytes）`);
  }
  if (size > PREVIEW_MAX_BYTES) {
    throw new SkillError(`文件过大（${size} bytes，上限 ${PREVIEW_MAX_BYTES}）`);
  }

  const buf = await getObjectBuffer(file.storageKey);
  return {
    id: skill.id,
    slug: skill.slug,
    displayName: skill.displayName,
    version: skill.latestVersion.version,
    path: file.filePath,
    content: buf.toString("utf8"),
  };
}

function decodeZipBase64(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const base64 = trimmed.includes(",") ? trimmed.slice(trimmed.indexOf(",") + 1) : trimmed;
  try {
    const buf = Buffer.from(base64, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

function assertPublishableVersion(version: string, latest: string | null, exists: boolean) {
  if (exists) {
    throw new SkillError(`版本冲突：${version} 已存在，请升高版本号后重传`, 409);
  }
  if (!latest) return;
  const cmp = compareVersions(version, latest);
  if (cmp !== null && cmp < 0) {
    throw new SkillError(`版本 ${version} 低于最新版本 ${latest}，请升高版本号后重传`, 409);
  }
}

export async function uploadSkillPackage(
  ownerId: string,
  input: {
    zipBuffer: Buffer;
    filename?: string;
    fallbackVersion?: string;
    skillId?: string;
    skillSetIds?: string[];
    matchFilename?: boolean;
  }
): Promise<SkillUploadResult> {
  const filename = input.filename?.trim() || "";
  if (input.matchFilename) {
    const nameErr = skillArchiveFilenameError(filename);
    if (nameErr) throw new SkillError(nameErr);
  }

  let parsed;
  try {
    parsed = await parseSkillZip(input.zipBuffer, {
      fallbackVersion: input.fallbackVersion,
      filename,
    });
  } catch (error) {
    throw new SkillError(error instanceof Error ? error.message : "解析技能包失败");
  }

  if (!parsed.version) {
    throw new SkillError(
      "缺少 version：请使用如 code-review-1.0.0.zip 的文件名，或在 SKILL.md 中指定"
    );
  }

  if (input.matchFilename) {
    const fromName = parseSkillArchiveFilename(filename);
    if (!fromName)
      throw new SkillError(skillArchiveFilenameError(filename) || "压缩包文件名不合法");
    if (parsed.slug !== fromName.slug) {
      throw new SkillError(
        `文件名 slug「${fromName.slug}」与 SKILL.md name/slug「${parsed.slug}」不一致`
      );
    }
    if (parsed.version !== fromName.version) {
      throw new SkillError(
        `文件名版本「${fromName.version}」与包内版本「${parsed.version}」不一致`
      );
    }
  }

  const skillSetIds = await ownedSkillSets(ownerId, input.skillSetIds ?? []);
  const skillIdOverride = input.skillId?.trim() || "";
  let skill = skillIdOverride
    ? await prisma.skill.findFirst({
        where: { id: skillIdOverride, ownerId },
        include: { latestVersion: { select: { version: true } } },
      })
    : await prisma.skill.findUnique({
        where: { ownerId_slug: { ownerId, slug: parsed.slug } },
        include: { latestVersion: { select: { version: true } } },
      });

  if (skillIdOverride && !skill) throw new SkillError("技能不存在", 404);

  const existingVersion = skill
    ? await prisma.skillVersion.findUnique({
        where: { skillId_version: { skillId: skill.id, version: parsed.version } },
        select: { id: true },
      })
    : null;
  assertPublishableVersion(
    parsed.version,
    skill?.latestVersion?.version ?? null,
    Boolean(existingVersion)
  );

  const isUpdate = Boolean(skill);
  const skillId = skill?.id || createId();
  const versionId = createId();
  const zipKey = packageZipKey(ownerId, skillId, parsed.version);
  const uploadedKeys: string[] = [zipKey];

  try {
    await putObject(zipKey, input.zipBuffer, "application/zip");
    for (const file of parsed.files) {
      const key = packageFileKey(ownerId, skillId, parsed.version, file.filePath);
      await putObject(key, file.content, file.contentType || undefined);
      uploadedKeys.push(key);
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!skill) {
        skill = await tx.skill.create({
          data: {
            id: skillId,
            ownerId,
            slug: parsed.slug,
            displayName: parsed.displayName,
            summary: parsed.summary,
            tags: parsed.tags,
          },
          include: { latestVersion: { select: { version: true } } },
        });
      } else {
        skill = await tx.skill.update({
          where: { id: skill.id },
          data: {
            displayName: parsed.displayName,
            summary: parsed.summary,
            tags: parsed.tags,
          },
          include: { latestVersion: { select: { version: true } } },
        });
      }

      const version = await tx.skillVersion.create({
        data: {
          id: versionId,
          skillId: skill.id,
          version: parsed.version!,
          storageKey: zipKey,
          fileCount: parsed.files.length,
          totalSize: BigInt(parsed.totalSize),
          metadata: parsed.metadata as Prisma.InputJsonValue,
          files: {
            create: parsed.files.map((file) => ({
              filePath: file.filePath,
              storageKey: packageFileKey(ownerId, skillId, parsed.version!, file.filePath),
              sha256: file.sha256,
              fileSize: BigInt(file.fileSize),
              contentType: file.contentType,
            })),
          },
        },
      });

      await tx.skill.update({
        where: { id: skill.id },
        data: { latestVersionId: version.id },
      });

      if (skillSetIds.length > 0) {
        await tx.skillSetSkill.createMany({
          data: skillSetIds.map((skillSetId) => ({ skillSetId, skillId: skill!.id })),
          skipDuplicates: true,
        });
      }

      return { skill, version };
    });

    return {
      id: result.skill.id,
      slug: result.skill.slug,
      displayName: result.skill.displayName,
      summary: result.skill.summary,
      tags: result.skill.tags,
      version: result.version.version,
      versionId: result.version.id,
      fileCount: result.version.fileCount,
      action: isUpdate ? ("update" as const) : ("create" as const),
    };
  } catch (error) {
    try {
      await deleteObjects(uploadedKeys);
    } catch {
      // 清理失败不影响把上传错误返回给调用方
    }
    if (error instanceof SkillError) throw error;
    console.error("upload skill failed", error);
    const [message, status] = friendlyUploadError(error);
    throw new SkillError(message, status);
  }
}

export function zipBufferFromBase64(raw: unknown) {
  if (typeof raw !== "string") return null;
  return decodeZipBase64(raw);
}

export async function getSkillDetail(ownerId: string, id: string): Promise<SkillDetail> {
  const skill = await prisma.skill.findFirst({
    where: { id, ownerId },
    include: {
      skillSets: { include: { skillSet: true } },
      latestVersion: true,
    },
  });
  if (!skill) throw new SkillError("技能不存在", 404);

  return {
    id: skill.id,
    slug: skill.slug,
    displayName: skill.displayName,
    summary: skill.summary,
    tags: skill.tags,
    icon: skill.icon,
    latestVersion: skill.latestVersion?.version ?? null,
    metadata: (skill.latestVersion?.metadata ?? null) as Record<string, unknown> | null,
    skillSets: skillSetsOf(skill.skillSets),
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

async function ownedSkillVersion(ownerId: string, skillId: string, version?: string | null) {
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, ownerId },
    include: { latestVersion: true },
  });
  if (!skill) throw new SkillError("技能不存在", 404);
  const requested = version?.trim();
  if (!requested) {
    if (!skill.latestVersion) throw new SkillError("技能还没有版本", 404);
    return { skill, version: skill.latestVersion };
  }
  const ver = await prisma.skillVersion.findUnique({
    where: { skillId_version: { skillId, version: requested } },
  });
  if (!ver) throw new SkillError("版本不存在", 404);
  return { skill, version: ver };
}

export async function listSkillVersionFiles(
  ownerId: string,
  skillId: string
): Promise<{ version: string; files: SkillVersionFile[] }> {
  const { version: ver } = await ownedSkillVersion(ownerId, skillId);
  const files = await prisma.skillFile.findMany({
    where: { versionId: ver.id },
    orderBy: { filePath: "asc" },
  });
  return {
    version: ver.version,
    files: files.map((file) => ({
      id: file.id,
      filePath: file.filePath,
      fileSize: file.fileSize.toString(),
      contentType: file.contentType,
      sha256: file.sha256,
    })),
  };
}

export async function readSkillVersionFile(
  ownerId: string,
  skillId: string,
  path: string | null
): Promise<SkillFileContent> {
  const filePath = path?.trim();
  if (!filePath) throw new SkillError("缺少 path 参数");
  const { version: ver } = await ownedSkillVersion(ownerId, skillId);
  const file = await prisma.skillFile.findUnique({
    where: { versionId_filePath: { versionId: ver.id, filePath } },
  });
  if (!file) throw new SkillError("文件不存在", 404);

  const size = Number(file.fileSize);
  const textLike = isProbablyText(file.filePath, file.contentType);
  const base = {
    path: file.filePath,
    contentType: file.contentType,
    fileSize: file.fileSize.toString(),
  };
  if (!textLike) return { ...base, binary: true, tooLarge: false, content: null };
  if (size > PREVIEW_MAX_BYTES) {
    return { ...base, binary: false, tooLarge: true, content: null };
  }
  const buf = await getObjectBuffer(file.storageKey);
  return { ...base, binary: false, tooLarge: false, content: buf.toString("utf8") };
}

export async function downloadSkillVersion(
  ownerId: string,
  skillId: string,
  version?: string | null
) {
  const { skill, version: ver } = await ownedSkillVersion(ownerId, skillId, version);
  const buffer = await getObjectBuffer(ver.storageKey);
  return {
    buffer,
    filename: `${skill.slug}-${ver.version}.zip`,
  };
}

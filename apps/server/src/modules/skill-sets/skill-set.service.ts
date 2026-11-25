import {
  normalizeIcon,
  slugify,
  type IconEntry,
  type PageOutput,
  type SkillSetDetail,
  type SkillSetListItem,
} from "@skill-manage/shared";
import { prisma } from "../../infra/prisma.js";
import { SkillSetError } from "../../shared/errors.js";
import { pageOffset, parsePage } from "../../shared/pagination.js";

export type SkillSetView = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  skillCount: number;
  createdAt: string;
  updatedAt: string;
};

function view(
  row: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon: string | null;
    createdAt: Date;
    updatedAt: Date;
    _count?: { skills: number };
  },
  skillCount?: number
): SkillSetView {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    skillCount: skillCount ?? row._count?.skills ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readIcon(value: unknown) {
  try {
    return normalizeIcon(value);
  } catch (error) {
    throw new SkillSetError(error instanceof Error ? error.message : "图标无效");
  }
}

export async function listSkillSets(
  ownerId: string,
  input: { current?: number; pageSize?: number; name?: string }
): Promise<PageOutput<SkillSetListItem>> {
  const name = input.name?.trim();
  const { current, pageSize } = parsePage(input);
  const where = {
    ownerId,
    ...(name ? { name: { contains: name, mode: "insensitive" as const } } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.skillSet.count({ where }),
    prisma.skillSet.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: pageOffset(current, pageSize),
      take: pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        icon: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { skills: true } },
      },
    }),
  ]);

  const list: SkillSetListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    icon: row.icon,
    skillCount: row._count.skills,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));

  return { list, total };
}

export async function listSkillSetIcons(ownerId: string, ids: string[]): Promise<IconEntry[]> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
  if (unique.length === 0) return [];
  const rows = await prisma.skillSet.findMany({
    where: { ownerId, id: { in: unique } },
    select: { id: true, icon: true },
  });
  return rows.map((row) => ({ id: row.id, icon: row.icon }));
}

export async function createSkillSet(ownerId: string, body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) throw new SkillSetError("请输入技能集名称");

  const slugInput = typeof body.slug === "string" ? body.slug.trim() : "";
  const slug = slugify(slugInput || name);
  const existing = await prisma.skillSet.findUnique({
    where: { ownerId_slug: { ownerId, slug } },
  });
  if (existing) throw new SkillSetError("技能集标识已存在", 409);

  const description = typeof body.description === "string" ? body.description.trim() || null : null;
  const icon = readIcon(body.icon) ?? null;
  const created = await prisma.skillSet.create({
    data: { ownerId, name, slug, description, icon },
  });
  return view(created, 0);
}

export async function updateSkillSet(ownerId: string, id: string, body: Record<string, unknown>) {
  const current = await prisma.skillSet.findFirst({
    where: { id, ownerId },
    include: { _count: { select: { skills: true } } },
  });
  if (!current) throw new SkillSetError("技能集不存在", 404);

  const data: {
    name?: string;
    slug?: string;
    description?: string | null;
    icon?: string | null;
  } = {};

  if ("icon" in body) data.icon = readIcon(body.icon) ?? null;
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) throw new SkillSetError("请输入技能集名称");
    data.name = name;
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    data.slug = slugify(body.slug);
  }
  if ("description" in body) {
    data.description =
      typeof body.description === "string" ? body.description.trim() || null : null;
  }

  if (data.slug && data.slug !== current.slug) {
    const clash = await prisma.skillSet.findUnique({
      where: { ownerId_slug: { ownerId, slug: data.slug } },
    });
    if (clash) throw new SkillSetError("技能集标识已存在", 409);
  }

  let skillIds: string[] | undefined;
  if ("skillIds" in body) {
    skillIds = idList(body.skillIds);
    if (skillIds.length > 0) {
      const owned = await prisma.skill.count({
        where: { ownerId, id: { in: skillIds } },
      });
      if (owned !== skillIds.length) throw new SkillSetError("存在无权关联的技能", 403);
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (skillIds) {
      await tx.skillSetSkill.deleteMany({ where: { skillSetId: id } });
      if (skillIds.length > 0) {
        await tx.skillSetSkill.createMany({
          data: skillIds.map((skillId) => ({ skillSetId: id, skillId })),
          skipDuplicates: true,
        });
      }
    }
    return tx.skillSet.update({ where: { id }, data });
  });
  return view(updated, skillIds ? skillIds.length : current._count.skills);
}

export async function deleteSkillSet(ownerId: string, id: string) {
  const current = await prisma.skillSet.findFirst({ where: { id, ownerId } });
  if (!current) throw new SkillSetError("技能集不存在", 404);

  await prisma.$transaction([
    prisma.skillSetSkill.deleteMany({ where: { skillSetId: id } }),
    prisma.skillSet.delete({ where: { id } }),
  ]);
}

export async function getSkillSetDetail(ownerId: string, id: string): Promise<SkillSetDetail> {
  const skillSet = await prisma.skillSet.findFirst({
    where: { id, ownerId },
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
  if (!skillSet) throw new SkillSetError("技能集不存在", 404);

  return {
    id: skillSet.id,
    name: skillSet.name,
    slug: skillSet.slug,
    description: skillSet.description,
    icon: skillSet.icon,
    createdAt: skillSet.createdAt.toISOString(),
    updatedAt: skillSet.updatedAt.toISOString(),
    skills: skillSet.skills.map((link) => ({
      id: link.skill.id,
      slug: link.skill.slug,
      displayName: link.skill.displayName,
      summary: link.skill.summary,
      icon: link.skill.icon,
      latestVersion: link.skill.latestVersion?.version ?? null,
      versionCount: link.skill._count.versions,
      linkedAt: link.createdAt.toISOString(),
    })),
  };
}

function idList(value: unknown) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new SkillSetError("技能参数无效");
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

export async function changeSkillSetSkills(
  ownerId: string,
  skillSetId: string,
  body: { add?: unknown; remove?: unknown }
) {
  const skillSet = await prisma.skillSet.findFirst({
    where: { id: skillSetId, ownerId },
  });
  if (!skillSet) throw new SkillSetError("技能集不存在", 404);

  const add = idList(body.add);
  const remove = idList(body.remove);
  if (add.length > 0) {
    const owned = await prisma.skill.findMany({
      where: { ownerId, id: { in: add } },
      select: { id: true },
    });
    if (owned.length !== add.length) throw new SkillSetError("存在无权关联的技能", 403);
    await prisma.skillSetSkill.createMany({
      data: owned.map((skill) => ({ skillSetId, skillId: skill.id })),
      skipDuplicates: true,
    });
  }
  if (remove.length > 0) {
    await prisma.skillSetSkill.deleteMany({
      where: { skillSetId, skillId: { in: remove } },
    });
  }

  const skills = await prisma.skillSetSkill.findMany({
    where: { skillSetId },
    include: { skill: true },
    orderBy: { createdAt: "desc" },
  });
  return {
    skills: skills.map((link) => ({
      id: link.skill.id,
      slug: link.skill.slug,
      displayName: link.skill.displayName,
      summary: link.skill.summary,
    })),
  };
}

import matter from "gray-matter";

/**
 * Skill metadata 解析与归一化。
 *
 * 技能包 frontmatter / meta 格式不统一，本模块单独维护：
 * 1) 解析原始 frontmatter（严格 YAML + 宽松回退）
 * 2) 把多种字段别名映射为列表/库表使用的稳定字段
 *
 * 新增兼容格式时，优先改这里，不要散落到上传或列表逻辑。
 */

export type SkillMetadataRaw = Record<string, unknown>;

/** 写入 skills 表、列表展示用的稳定字段 */
export type StableSkillFields = {
  name: string;
  displayName: string;
  /** 用于生成 slug 的原始字符串（再交给 slugify） */
  slugSource: string;
  summary: string | null;
  tags: string[];
  version: string | null;
};

export type ParsedSkillMetadata = StableSkillFields & {
  /** 完整原始 frontmatter，归档到 version.metadata */
  raw: SkillMetadataRaw;
};

function stripWrappingQuotes(value: string): string {
  if (value.length >= 2) {
    const double = value.startsWith('"') && value.endsWith('"');
    const single = value.startsWith("'") && value.endsWith("'");
    if (double || single) return value.slice(1, -1);
  }
  return value;
}

function isCompleteQuotedScalar(parts: string[]): boolean {
  if (parts.length !== 1) return false;
  const v = parts[0];
  if (v.length < 2) return false;
  return (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  );
}

function isBlockScalarMarker(value: string): boolean {
  return value === "|" || value === ">" || value === "|-" || value === ">-";
}

function extractFrontmatterBlock(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("---")) return null;
  const firstNl = trimmed.indexOf("\n");
  if (firstNl < 0) return null;
  const second = trimmed.indexOf("\n---", firstNl + 1);
  if (second < 0) return null;
  return trimmed.slice(firstNl + 1, second);
}

/**
 * 严格 YAML 失败时的行解析回退
 *（如 quoted summary 后残留缩进垃圾行）。
 */
function parseLooseFrontmatter(content: string): SkillMetadataRaw {
  const yamlContent = extractFrontmatterBlock(content);
  if (yamlContent == null) return {};

  const values: SkillMetadataRaw = {};
  let currentKey: string | null = null;
  let currentParts: string[] = [];
  let currentList: string[] | null = null;
  let inBlock = false;

  const flush = () => {
    if (!currentKey) return;
    if (currentList) {
      values[currentKey] = currentList;
    } else {
      values[currentKey] = stripWrappingQuotes(currentParts.join("\n").trim());
    }
    currentKey = null;
    currentParts = [];
    currentList = null;
    inBlock = false;
  };

  for (const rawLine of yamlContent.split(/\r?\n/)) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;

    const topLevel = /^([A-Za-z0-9_-]+)\s*:\s*(.*)$/.exec(rawLine);
    if (topLevel && !/^\s/.test(rawLine)) {
      flush();
      currentKey = topLevel[1];
      const rest = topLevel[2].trim();
      if (!rest) {
        currentParts = [];
        currentList = [];
        inBlock = false;
      } else if (isBlockScalarMarker(rest)) {
        currentParts = [];
        currentList = null;
        inBlock = true;
      } else {
        currentParts = [rest];
        currentList = null;
        inBlock = false;
      }
      continue;
    }

    if (!currentKey) continue;

    const listItem = /^\s*-\s+(.*)$/.exec(rawLine);
    if (listItem) {
      if (!currentList) {
        currentList = currentParts.length
          ? currentParts.map((p) => stripWrappingQuotes(p))
          : [];
        currentParts = [];
        inBlock = false;
      }
      currentList.push(stripWrappingQuotes(listItem[1].trim()));
      continue;
    }

    if (
      !inBlock &&
      currentList == null &&
      isCompleteQuotedScalar(currentParts) &&
      /^\s+\S/.test(rawLine)
    ) {
      continue;
    }

    if (inBlock || /^\s+\S/.test(rawLine)) {
      if (currentList) {
        currentList.push(trimmedLine);
      } else {
        currentParts.push(trimmedLine);
      }
    }
  }
  flush();
  return values;
}

function toJsonSafe(value: unknown): unknown {
  if (value == null) return null;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (typeof value === "object") {
    const out: SkillMetadataRaw = {};
    for (const [k, v] of Object.entries(value as SkillMetadataRaw)) {
      if (v === undefined) continue;
      out[k] = toJsonSafe(v);
    }
    return out;
  }
  return String(value);
}

export function asMetaString(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

/** 标签：支持 string[]、逗号分隔字符串等 */
export function normalizeTags(value: unknown): string[] {
  const parts: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      const s = asMetaString(item);
      if (s) parts.push(s);
    }
  } else if (typeof value === "string") {
    for (const item of value.split(/[,，]/)) {
      const s = item.trim();
      if (s) parts.push(s);
    }
  }
  return [...new Set(parts)];
}

function pickString(
  sources: SkillMetadataRaw[],
  keys: string[],
): string | null {
  for (const source of sources) {
    for (const key of keys) {
      const value = asMetaString(source[key]);
      if (value) return value;
    }
  }
  return null;
}

function pickTags(sources: SkillMetadataRaw[]): string[] {
  const tagKeys = ["tags", "labels", "keywords"];
  for (const source of sources) {
    for (const key of tagKeys) {
      if (source[key] === undefined || source[key] === null) continue;
      const tags = normalizeTags(source[key]);
      if (tags.length) return tags;
    }
  }
  return [];
}

function nestedMetadata(raw: SkillMetadataRaw): SkillMetadataRaw {
  const nested = raw.metadata;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as SkillMetadataRaw;
  }
  return {};
}

/**
 * 解析 SKILL.md 的 frontmatter 原始对象（不归一化）。
 * 优先 gray-matter 严格 YAML，失败则宽松行解析。
 */
export function parseSkillFrontmatterRaw(content: string): SkillMetadataRaw {
  try {
    const parsed = matter(content);
    const data = toJsonSafe(parsed.data) as SkillMetadataRaw;
    if (asMetaString(data.name)) return data;
  } catch {
    // fall through
  }

  const loose = parseLooseFrontmatter(content);
  if (asMetaString(loose.name)) {
    return toJsonSafe(loose) as SkillMetadataRaw;
  }
  throw new Error("SKILL.md frontmatter 格式无效或缺少 name");
}

/**
 * 把任意格式的 raw metadata 归一成稳定字段。
 * 兼容顶层字段、嵌套 metadata、以及常见别名。
 */
export function normalizeSkillMetadata(
  raw: SkillMetadataRaw,
): ParsedSkillMetadata {
  const nested = nestedMetadata(raw);
  const sources = [raw, nested];

  const name = pickString(sources, ["name"]);
  if (!name) {
    throw new Error("SKILL.md frontmatter 缺少 name");
  }

  const displayName =
    pickString(sources, [
      "displayName",
      "display_name",
      "display-name",
      "title",
    ]) || name;

  const slugSource =
    pickString(sources, ["slug", "id", "package"]) || name;

  const summary = pickString(sources, [
    "summary",
    "description",
    "desc",
    "about",
  ]);

  const version = pickString(sources, ["version", "ver"]);
  const tags = pickTags(sources);

  return {
    name,
    displayName,
    slugSource,
    summary,
    tags,
    version,
    raw,
  };
}

/** 从 SKILL.md 正文一站式解析并归一化 */
export function parseSkillMetadata(skillMdContent: string): ParsedSkillMetadata {
  return normalizeSkillMetadata(parseSkillFrontmatterRaw(skillMdContent));
}

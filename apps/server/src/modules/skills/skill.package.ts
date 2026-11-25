import { createHash } from "crypto";
import JSZip from "jszip";
import mime from "mime";
import {
  parseSkillMetadata,
  normalizeTags,
  slugify,
  extractVersionFromFilename,
} from "@skill-manage/shared";

export { extractVersionFromFilename, normalizeTags };

export const PREVIEW_MAX_BYTES = 256 * 1024;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 50 * 1024 * 1024;
export const MAX_FILE_COUNT = 500;

export type ParsedSkillFile = {
  filePath: string;
  content: Buffer;
  sha256: string;
  fileSize: number;
  contentType: string | null;
};

export type ParsedSkillPackage = {
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  version: string | null;
  /** Full SKILL.md frontmatter (all meta fields). */
  metadata: Record<string, unknown>;
  files: ParsedSkillFile[];
  totalSize: number;
};

function normalizePath(path: string): string | null {
  const cleaned = path.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!cleaned || cleaned.endsWith("/")) return null;
  if (cleaned.includes("..")) return null;
  return cleaned;
}

function stripCommonRoot(entries: { raw: string; rel: string }[]): void {
  if (entries.length === 0) return;
  const first = entries[0].rel.split("/");
  if (first.length < 2) return;
  const root = first[0];
  if (!entries.every((e) => e.rel === root || e.rel.startsWith(`${root}/`))) {
    return;
  }
  for (const e of entries) {
    if (e.rel === root) {
      e.rel = "";
    } else {
      e.rel = e.rel.slice(root.length + 1);
    }
  }
}

export async function parseSkillZip(
  zipBuffer: Buffer,
  options?: { fallbackVersion?: string; filename?: string },
): Promise<ParsedSkillPackage> {
  const fallbackVersion = options?.fallbackVersion;
  const filename = options?.filename;

  const zip = await JSZip.loadAsync(zipBuffer);
  const entries: { raw: string; rel: string; entry: JSZip.JSZipObject }[] = [];

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const normalized = normalizePath(name);
    if (!normalized) {
      throw new Error(`非法文件路径: ${name}`);
    }
    entries.push({ raw: name, rel: normalized, entry });
  }

  if (entries.length === 0) {
    throw new Error("压缩包为空");
  }
  if (entries.length > MAX_FILE_COUNT) {
    throw new Error(`文件数量超过上限 ${MAX_FILE_COUNT}`);
  }

  stripCommonRoot(entries);
  const usable = entries.filter((e) => e.rel);

  const files: ParsedSkillFile[] = [];
  let totalSize = 0;

  for (const { rel, entry } of usable) {
    const content = Buffer.from(await entry.async("uint8array"));
    if (content.length > MAX_FILE_BYTES) {
      throw new Error(`文件过大: ${rel}`);
    }
    totalSize += content.length;
    if (totalSize > MAX_TOTAL_BYTES) {
      throw new Error(`压缩包总大小超过上限`);
    }

    files.push({
      filePath: rel,
      content,
      sha256: createHash("sha256").update(content).digest("hex"),
      fileSize: content.length,
      contentType: mime.getType(rel),
    });
  }

  const skillMd = files.find(
    (f) =>
      f.filePath === "SKILL.md" || f.filePath.toLowerCase() === "skill.md",
  );
  if (!skillMd) {
    throw new Error("技能根目录必须包含 SKILL.md");
  }

  const meta = parseSkillMetadata(skillMd.content.toString("utf8"));
  const slug = slugify(meta.slugSource, 128);

  let version = meta.version;
  if (!version && fallbackVersion?.trim()) {
    version = fallbackVersion.trim();
  }
  if (!version && filename) {
    version = extractVersionFromFilename(filename);
  }

  return {
    slug,
    displayName: meta.displayName,
    summary: meta.summary,
    tags: meta.tags,
    version,
    metadata: meta.raw,
    files,
    totalSize,
  };
}

export function isProbablyText(filePath: string, contentType: string | null) {
  if (contentType?.startsWith("text/")) return true;
  if (contentType === "application/json") return true;
  return /\.(md|txt|json|ya?ml|ts|tsx|js|jsx|py|sh|css|html|svg|toml|xml|csv)$/i.test(
    filePath,
  );
}

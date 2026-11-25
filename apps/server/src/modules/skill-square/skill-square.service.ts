import { createHash } from "crypto";
import type { SquareSkill } from "@skill-manage/shared";
import { config } from "../../config/env.js";
import { SkillHubError } from "../../shared/errors.js";
import { parsePage } from "../../shared/pagination.js";
import { isProbablyText, PREVIEW_MAX_BYTES } from "../skills/skill.package.js";
import { updateSkill, uploadSkillPackage } from "../skills/skill.service.js";

const BASE_URL = config.skillHubBaseUrl.replace(/\/$/, "");
const MAX_ZIP_BYTES = 52 * 1024 * 1024;
const SLUG_RE = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const CATEGORY_RE = /^[a-z0-9-]{1,64}$/;
const SORTS = new Set(["score", "downloads", "updated_at", "stars", "installs"]);

export type { SquareSkill };

type RemoteSkill = {
  slug?: string;
  name?: string;
  description?: string;
  description_zh?: string;
  version?: string;
  iconUrl?: string | null;
  category?: string;
  subCategories?: { key?: string; name?: string }[];
  downloads?: number;
  stars?: number;
  updated_at?: number;
  publisher?: { name?: string | null } | null;
  namespace?: { displayName?: string | null } | null;
  labels?: Record<string, string> | null;
};

type RemoteDetail = {
  slug?: string;
  latestVersion?: { version?: string };
  publisher?: { name?: string | null } | null;
  namespace?: { displayName?: string | null } | null;
  skill?: {
    slug?: string;
    displayName?: string;
    summary?: string;
    summary_zh?: string;
    iconUrl?: string | null;
    category?: string;
    subCategories?: { key?: string; name?: string }[];
    updatedAt?: number;
    labels?: Record<string, string> | null;
    stats?: { downloads?: number; stars?: number };
  };
};

function clientUserId(userId: string) {
  return createHash("sha256").update(userId).digest("hex").slice(0, 16);
}

function requestHeaders(userId: string, accept: string) {
  const headers: Record<string, string> = {
    accept,
    "X-Client-User-Id": clientUserId(userId),
  };
  const apiKey = process.env.SKILLHUB_API_KEY?.trim();
  if (apiKey) headers["X-API-Key"] = apiKey;
  return headers;
}

async function skillhubFetch(path: string, userId: string, accept: string, timeoutMs: number) {
  try {
    return await fetch(`${BASE_URL}${path}`, {
      headers: requestHeaders(userId, accept),
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    } as RequestInit);
  } catch {
    throw new SkillHubError("技能广场暂时不可用");
  }
}

function errorMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const record = body as { error?: unknown; message?: unknown };
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  return fallback;
}

async function skillhubJson<T>(path: string, userId: string): Promise<T> {
  const res = await skillhubFetch(path, userId, "application/json", 20_000);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    if (res.status === 404) throw new SkillHubError("技能不存在或未公开", 404);
    if (res.status === 429) throw new SkillHubError("请求过于频繁，请稍后再试", 429);
    throw new SkillHubError(errorMessage(body, "技能广场暂时不可用"));
  }
  return body as T;
}

function assertSlug(slug: string) {
  if (!SLUG_RE.test(slug)) throw new SkillHubError("技能标识无效", 400);
}

function isAccountId(value: string) {
  return /^(?:user|u)_[0-9a-f]{6,}$/i.test(value) || /^org-[a-z0-9]{6,}$/i.test(value);
}

function sourceName(raw: {
  publisher?: { name?: string | null } | null;
  namespace?: { displayName?: string | null } | null;
}) {
  const name = raw.publisher?.name?.trim() || raw.namespace?.displayName?.trim() || "";
  if (!name) return null;
  if (isAccountId(name)) return "SkillHub";
  return name;
}

function mapSkill(raw: RemoteSkill): SquareSkill | null {
  const slug = raw.slug?.trim() || "";
  if (!SLUG_RE.test(slug)) return null;
  const labels = raw.labels || {};
  const summary = (raw.description_zh || raw.description || "").trim() || null;
  return {
    slug,
    displayName: raw.name?.trim() || slug,
    summary,
    version: raw.version?.trim() || null,
    icon: raw.iconUrl || null,
    category: raw.category?.trim() || null,
    tags: (raw.subCategories || []).map((item) => item.name?.trim() || "").filter(Boolean),
    downloads: raw.downloads ?? 0,
    stars: raw.stars ?? 0,
    updatedAt: raw.updated_at ? new Date(raw.updated_at).toISOString() : null,
    publisher: sourceName(raw),
    requiresApiKey: labels.requires_api_key === "true",
    paid: labels.pricing_type === "paid",
  };
}

export async function listSquareSkills(
  input: {
    current?: number;
    pageSize?: number;
    name?: string;
    category?: string;
    sortBy?: string;
  },
  userId: string
) {
  const { current, pageSize } = parsePage(input);
  const name = input.name?.trim() || "";
  const category = input.category?.trim() || "";
  const sortRaw = input.sortBy?.trim() || "score";
  if (category && !CATEGORY_RE.test(category)) {
    throw new SkillHubError("分类无效", 400);
  }
  const sortBy = SORTS.has(sortRaw) ? sortRaw : "score";
  const qs = new URLSearchParams({
    page: String(current),
    pageSize: String(pageSize),
    sortBy,
    order: "desc",
  });
  if (name) qs.set("keyword", name);
  if (category) qs.set("category", category);

  const body = await skillhubJson<{
    code?: number;
    message?: string;
    data?: { total?: number; skills?: RemoteSkill[] };
  }>(`/api/skills?${qs}`, userId);
  if (body.code !== 0 || !body.data) {
    throw new SkillHubError(body.message || "技能广场暂时不可用");
  }
  return {
    list: (body.data.skills || [])
      .map(mapSkill)
      .filter((item): item is SquareSkill => Boolean(item)),
    total: body.data.total ?? 0,
  };
}

export async function getSquareSkill(slug: string, userId: string) {
  assertSlug(slug);
  const body = await skillhubJson<RemoteDetail>(
    `/api/v1/skills/${encodeURIComponent(slug)}`,
    userId
  );
  const skill = body.skill;
  const mapped = skill
    ? mapSkill({
        slug: skill.slug || body.slug || slug,
        name: skill.displayName,
        description: skill.summary,
        description_zh: skill.summary_zh,
        version: body.latestVersion?.version,
        iconUrl: skill.iconUrl,
        category: skill.category,
        subCategories: skill.subCategories,
        downloads: skill.stats?.downloads,
        stars: skill.stats?.stars,
        updated_at: skill.updatedAt,
        publisher: body.publisher,
        namespace: body.namespace,
        labels: skill.labels,
      })
    : null;
  if (!mapped) throw new SkillHubError("技能不存在或未公开", 404);
  return mapped;
}

function assertFilePath(value: string | null) {
  const filePath = (value || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!filePath || filePath.includes("..") || filePath.includes("\0")) {
    throw new SkillHubError("非法路径", 400);
  }
  return filePath;
}

export async function listSquareFiles(slug: string, userId: string) {
  assertSlug(slug);
  const body = await skillhubJson<{
    version?: string;
    files?: { path?: string; size?: number }[];
  }>(`/api/v1/skills/${encodeURIComponent(slug)}/files`, userId);
  const files = (body.files || []).flatMap((file) => {
    const filePath = file.path?.replace(/\\/g, "/").replace(/^\/+/, "") || "";
    if (
      !filePath ||
      filePath.includes("..") ||
      filePath === "_meta.json" ||
      filePath.endsWith("/_meta.json")
    ) {
      return [];
    }
    return [
      {
        id: filePath,
        filePath,
        fileSize: String(file.size ?? 0),
        contentType: null as string | null,
      },
    ];
  });
  return { version: body.version?.trim() || null, files };
}

export async function readSquareFile(slug: string, path: string | null, userId: string) {
  assertSlug(slug);
  const filePath = assertFilePath(path);
  const res = await skillhubFetch(
    `/api/v1/skills/${encodeURIComponent(slug)}/file?path=${encodeURIComponent(filePath)}`,
    userId,
    "*/*",
    20_000
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (res.status === 404) throw new SkillHubError("文件不存在", 404);
    if (res.status === 429) throw new SkillHubError("请求过于频繁，请稍后再试", 429);
    throw new SkillHubError(errorMessage(body, "读取文件失败"));
  }

  const type = (res.headers.get("content-type") || "").split(";")[0].trim() || null;
  const advertised = Number(res.headers.get("content-length") || 0);
  const textLike = isProbablyText(filePath, type);
  const base = {
    path: filePath,
    contentType: type,
    fileSize: advertised > 0 ? String(advertised) : "0",
  };
  if (!textLike) {
    await res.body?.cancel().catch(() => undefined);
    return { ...base, binary: true, tooLarge: false, content: null };
  }
  if (advertised > PREVIEW_MAX_BYTES) {
    await res.body?.cancel().catch(() => undefined);
    return { ...base, binary: false, tooLarge: true, content: null };
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > PREVIEW_MAX_BYTES) {
    return {
      ...base,
      fileSize: String(bytes.length),
      binary: false,
      tooLarge: true,
      content: null,
    };
  }
  return {
    ...base,
    fileSize: String(bytes.length),
    binary: false,
    tooLarge: false,
    content: bytes.toString("utf8"),
  };
}

export async function listSquareCategories(userId: string) {
  const body = await skillhubJson<{
    items?: { key?: string; name?: string; active?: boolean; level?: number }[];
  }>("/api/v1/categories", userId);
  const list = (body.items || [])
    .filter((item) => item.active !== false && item.level === 1 && item.key && item.name)
    .filter((item) => CATEGORY_RE.test(item.key || ""))
    .map((item) => ({ key: item.key as string, name: item.name as string }));
  return { list };
}

function allowedIconUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "skillhub.cn" ||
      host.endsWith(".skillhub.cn") ||
      host.endsWith(".myqcloud.com") ||
      host.endsWith(".tencent.com") ||
      host.endsWith(".tencent-cloud.com")
    );
  } catch {
    return false;
  }
}

async function iconDataUrl(iconUrl: string) {
  if (!allowedIconUrl(iconUrl)) return null;
  let res: Response;
  try {
    res = await fetch(iconUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 200 * 1024) return null;
  const headerType = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const fromHeader =
    headerType === "image/jpg"
      ? "jpeg"
      : headerType.startsWith("image/")
        ? headerType.slice(6)
        : "";
  const subtype = ["png", "jpeg", "webp", "gif"].includes(fromHeader)
    ? fromHeader
    : imageSubtype(bytes);
  if (!subtype) return null;
  return `data:image/${subtype};base64,${bytes.toString("base64")}`;
}

function imageSubtype(bytes: Buffer) {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return "jpeg";
  if (bytes.length >= 6 && bytes.subarray(0, 3).toString("ascii") === "GIF") return "gif";
  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "webp";
  }
  return "";
}

async function downloadZip(slug: string, userId: string) {
  const res = await skillhubFetch(
    `/api/v1/download?slug=${encodeURIComponent(slug)}`,
    userId,
    "application/zip,*/*",
    60_000
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = null;
    }
    if (res.status === 404) throw new SkillHubError("技能不存在或未公开", 404);
    if (res.status === 429) throw new SkillHubError("请求过于频繁，请稍后再试", 429);
    throw new SkillHubError(errorMessage(body, "下载技能失败"));
  }
  const advertised = Number(res.headers.get("content-length") || 0);
  if (advertised > MAX_ZIP_BYTES) throw new SkillHubError("技能包过大", 400);
  const zipBuffer = Buffer.from(await res.arrayBuffer());
  if (zipBuffer.length > MAX_ZIP_BYTES) throw new SkillHubError("技能包过大", 400);
  if (zipBuffer.length < 4 || zipBuffer[0] !== 0x50 || zipBuffer[1] !== 0x4b) {
    throw new SkillHubError("下载的不是技能压缩包", 502);
  }
  return zipBuffer;
}

/** 把公开技能下载后写入当前账号的技能库。 */
export async function importSquareSkill(ownerId: string, slug: string, skillSetIds: string[]) {
  assertSlug(slug);
  const detail = await skillhubJson<RemoteDetail>(
    `/api/v1/skills/${encodeURIComponent(slug)}`,
    ownerId
  );
  const version = detail.latestVersion?.version?.trim() || undefined;
  const zipBuffer = await downloadZip(slug, ownerId);
  const created = await uploadSkillPackage(ownerId, {
    zipBuffer,
    filename: version ? `${slug}-${version}.zip` : `${slug}.zip`,
    fallbackVersion: version,
    skillSetIds,
  });

  const iconUrl = detail.skill?.iconUrl;
  if (iconUrl) {
    try {
      const icon = await iconDataUrl(iconUrl);
      if (icon) await updateSkill(ownerId, created.id, { icon });
    } catch (error) {
      console.error("import skill icon failed", error);
    }
  }
  return created;
}

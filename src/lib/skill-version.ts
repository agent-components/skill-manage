/** Extract version from zip name, e.g. agent-browser-0.1.0.zip → 0.1.0 */
export function extractVersionFromFilename(filename: string): string | null {
  return parseSkillArchiveFilename(filename)?.version ?? null;
}

/**
 * 上传约定：压缩包文件名必须是 `{slug}-{version}.zip`
 * 例：code-review-1.0.0.zip、agent-browser-0.1.0-beta.1.zip
 */
export function parseSkillArchiveFilename(filename: string): {
  slug: string;
  version: string;
} | null {
  const base = filename.replace(/^.*[/\\]/, "").trim();
  if (!base) return null;

  const match = base.match(
    /^([a-z0-9]+(?:-[a-z0-9]+)*)-v?(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.]+)?)\.zip$/i,
  );
  if (!match) return null;

  return {
    slug: match[1].toLowerCase(),
    version: match[2],
  };
}

type Semver = {
  major: number;
  minor: number;
  patch: number;
  pre: string[];
};

/** 解析 x.y.z，可带 v 前缀、预发布号和构建号。无法解析时返回 null。 */
export function parseSemver(version: string): Semver | null {
  const match = version
    .trim()
    .match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.]+))?(?:\+[0-9A-Za-z.]+)?$/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    pre: match[4] ? match[4].split(".").filter(Boolean) : [],
  };
}

function comparePreRelease(a: string, b: string) {
  const aNum = /^\d+$/.test(a);
  const bNum = /^\d+$/.test(b);
  if (aNum && bNum) return Number(a) - Number(b);
  if (aNum) return -1;
  if (bNum) return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** 比较两个语义化版本。大于返回正数，无法解析返回 null。 */
export function compareVersions(left: string, right: string): number | null {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) return null;
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.pre.length === 0 && b.pre.length === 0) return 0;
  if (a.pre.length === 0) return 1;
  if (b.pre.length === 0) return -1;
  const count = Math.max(a.pre.length, b.pre.length);
  for (let i = 0; i < count; i += 1) {
    if (i >= a.pre.length) return -1;
    if (i >= b.pre.length) return 1;
    const diff = comparePreRelease(a.pre[i], b.pre[i]);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function skillArchiveFilenameError(filename: string | undefined): string | null {
  if (!filename?.trim()) {
    return "缺少 filename：压缩包须命名为 {slug}-{version}.zip，如 code-review-1.0.0.zip";
  }
  if (!parseSkillArchiveFilename(filename)) {
    return `压缩包文件名不合法「${filename.replace(/^.*[/\\]/, "")}」，须为 {slug}-{version}.zip（例：code-review-1.0.0.zip）`;
  }
  return null;
}

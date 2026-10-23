/** Extract version from zip name, e.g. agent-browser-0.1.0.zip → 0.1.0 */
export function extractVersionFromFilename(filename: string): string | null {
  return parseSkillArchiveFilename(filename)?.version ?? null;
}

/**
 * MCP / 上传约定：压缩包文件名必须是 `{slug}-{version}.zip`
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

export function skillArchiveFilenameError(filename: string | undefined): string | null {
  if (!filename?.trim()) {
    return "缺少 filename：压缩包须命名为 {slug}-{version}.zip，如 code-review-1.0.0.zip";
  }
  if (!parseSkillArchiveFilename(filename)) {
    return `压缩包文件名不合法「${filename.replace(/^.*[/\\]/, "")}」，须为 {slug}-{version}.zip（例：code-review-1.0.0.zip）`;
  }
  return null;
}

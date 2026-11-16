const ICON_RE = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\r\n]+$/i;
const MAX_ICON_BYTES = 200 * 1024;

export function formatIconSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb >= 100 ? `${Math.round(kb)} KB` : `${kb.toFixed(1)} KB`;
}

function dataUrlBytes(value: string) {
  const body = value.slice(value.indexOf(",") + 1).replace(/\s/g, "");
  const padding = body.endsWith("==") ? 2 : body.endsWith("=") ? 1 : 0;
  return Math.floor((body.length * 3) / 4) - padding;
}

/** 校验并规范化项目图标。空值表示清除；undefined 表示请求未带该字段。 */
export function normalizeProjectIcon(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !ICON_RE.test(value)) {
    throw new Error("图标需为 PNG、JPEG、WebP 或 GIF");
  }
  const bytes = dataUrlBytes(value);
  if (bytes > MAX_ICON_BYTES) {
    throw new Error(`图片大小为 ${formatIconSize(bytes)}，不能超过 200KB`);
  }
  return value;
}

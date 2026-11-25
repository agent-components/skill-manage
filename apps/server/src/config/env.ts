/** 开关类环境变量：未设置或为 0/false 时关闭。 */
function readToggle(raw: string | undefined) {
  const value = raw?.trim().toLowerCase();
  if (!value) return false;
  return value !== "0" && value !== "false";
}

/** 正整数环境变量：非法或缺失时回退默认值。 */
function readPositiveInt(raw: string | undefined, fallback: number) {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

/**
 * 运行时配置。所有环境变量在这里集中读取，避免散落在业务代码里。
 * 注意：本模块在 import 时求值，所以 `dotenv/config` 必须在入口文件最前面加载。
 */
export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || "0.0.0.0",
  /** 对外访问根地址，宿主回调拼绝对链接时使用 */
  appBaseUrl: process.env.APP_BASE_URL?.trim() || "",
  /** 宿主 Harness Admin 源，用于服务端兑换 harness_sso */
  harnessOrigin: process.env.HARNESS_ORIGIN?.trim() || "",
  /** 技能广场上游 */
  skillHubBaseUrl: process.env.SKILLHUB_BASE_URL?.trim() || "https://api.skillhub.cn",
  /** MCP 服务开关：MCP_ENABLED 存在且不为 0 时暴露 /mcp 端点 */
  mcpEnabled: readToggle(process.env.MCP_ENABLED),
  /** MCP 下载短链有效期（秒），默认 900 */
  downloadLinkTtlSeconds: readPositiveInt(process.env.DOWNLOAD_LINK_TTL_SECONDS, 900),
} as const;

export const isProduction = config.nodeEnv === "production";
export const isTest = config.nodeEnv === "test";

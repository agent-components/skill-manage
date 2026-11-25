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
  skillHubBaseUrl:
    process.env.SKILLHUB_BASE_URL?.trim() || "https://api.skillhub.cn",
} as const;

export const isProduction = config.nodeEnv === "production";
export const isTest = config.nodeEnv === "test";

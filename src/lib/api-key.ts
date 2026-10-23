import { createHash, randomBytes } from "crypto";

/** 令牌前缀，与登录会话（纯十六进制）区分 */
export const API_KEY_PREFIX = "sk_";

export function isApiKey(token: string) {
  return token.startsWith(API_KEY_PREFIX);
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** 列表脱敏：前缀 + ** */
export function maskApiKey(prefix: string) {
  return `${prefix}**`;
}

/** 生成令牌明文、摘要和可展示的前缀 */
export function generateApiKey() {
  const token = API_KEY_PREFIX + randomBytes(32).toString("base64url");
  return {
    token,
    keyHash: hashApiKey(token),
    prefix: token.slice(0, 12),
  };
}

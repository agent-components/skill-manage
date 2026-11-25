/**
 * 全应用统一的业务异常。
 *
 * 所有业务错误都带 HTTP 状态码，tRPC / REST 两层可以直接映射，
 * 不需要各自再写一遍错误翻译。
 */
export class AppError extends Error {
  /** 对外返回的 HTTP 状态码 */
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

/** 技能相关错误 */
export class SkillError extends AppError {}

/** 技能集相关错误 */
export class SkillSetError extends AppError {}

/** 技能广场（上游）相关错误 */
export class SkillHubError extends AppError {
  constructor(message: string, status = 502) {
    super(message, status);
  }
}

/** 鉴权相关错误 */
export class AuthError extends AppError {
  constructor(message = "未登录", status = 401) {
    super(message, status);
  }
}

/** 判断是否为带状态码的业务异常 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

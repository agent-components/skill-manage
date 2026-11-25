/**
 * 宿主拉取的公开菜单。
 *
 * 菜单内容属于「宿主与前端共享的契约」，统一定义在 @skill-manage/shared，
 * 服务端这里只做转发，避免前后端两份定义漂移。
 */
export { HARNESS_MENUS } from "@skill-manage/shared";
export type { HarnessMenuItem } from "@skill-manage/shared";

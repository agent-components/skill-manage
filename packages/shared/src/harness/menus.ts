import type { HarnessMenuItem } from "../types.js";

/**
 * 宿主拉取的公开菜单。path 相对本组件域名，必须以 / 开头。
 * 前后端共用这一份定义，服务端通过 modules/harness/menus.ts 转发。
 */
export const HARNESS_MENUS: HarnessMenuItem[] = [
  { key: "skill-sets", label: "专家列表", path: "/skill-sets" },
  { key: "skills", label: "技能列表", path: "/skills" },
  { key: "skill-square", label: "技能广场", path: "/skill-square" },
];

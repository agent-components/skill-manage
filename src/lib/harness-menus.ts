/** 宿主拉取的公开菜单。path 相对本组件域名，必须以 / 开头。 */
export type HarnessMenuItem = {
  key: string;
  label: string;
  path?: string;
  children?: HarnessMenuItem[];
};

export const HARNESS_MENUS: HarnessMenuItem[] = [
  { key: "projects", label: "技能集管理", path: "/projects" },
  { key: "skills", label: "技能管理", path: "/skills" },
  { key: "tokens", label: "令牌管理", path: "/tokens" },
];

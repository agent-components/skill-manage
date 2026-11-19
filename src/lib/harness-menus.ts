/** 宿主拉取的公开菜单。path 相对本组件域名，必须以 / 开头。 */
export type HarnessMenuItem = {
  key: string;
  label: string;
  path?: string;
  children?: HarnessMenuItem[];
};

export const HARNESS_MENUS: HarnessMenuItem[] = [
  { key: "skill-sets", label: "专家列表", path: "/skill-sets" },
  { key: "skills", label: "技能列表", path: "/skills" },
  { key: "skill-square", label: "技能广场", path: "/skill-square" },
];

/** 登录用户 */
export type AuthUser = {
  id: string;
  account: string;
  displayName: string;
  role: "ADMIN" | "USER";
  email: string | null;
};

/** 分页请求 */
export type PageInput = {
  current?: number;
  pageSize?: number;
};

export type PageOutput<T> = {
  list: T[];
  total: number;
};

export type SkillSetRef = {
  id: string;
  name: string;
  slug: string;
};

/** 技能列表项 */
export type SkillListItem = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  icon: string | null;
  latestVersion: string | null;
  versionCount: number;
  skillSets: SkillSetRef[];
  createdAt: string;
  updatedAt: string;
};

/** 技能集列表项 */
export type SkillSetListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  skillCount: number;
  createdAt: string;
  updatedAt: string;
};

/** 技能详情 */
export type SkillDetail = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  icon: string | null;
  latestVersion: string | null;
  metadata: Record<string, unknown> | null;
  skillSets: SkillSetRef[];
  createdAt: string;
  updatedAt: string;
};

/** 技能集详情 */
export type SkillSetDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  skills: {
    id: string;
    slug: string;
    displayName: string;
    summary: string | null;
    icon: string | null;
    latestVersion: string | null;
    versionCount: number;
    linkedAt: string;
  }[];
};

/** 技能包内文件 */
export type SkillVersionFile = {
  id: string;
  filePath: string;
  fileSize: string;
  contentType: string | null;
  sha256: string;
};

/** 技能文件内容预览 */
export type SkillFileContent = {
  path: string;
  contentType: string | null;
  fileSize: string;
  binary: boolean;
  tooLarge: boolean;
  content: string | null;
};

/** 上传技能包结果 */
export type SkillUploadResult = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  version: string;
  versionId: string;
  fileCount: number;
  action: "create" | "update";
};

/** 图标查询结果 */
export type IconEntry = {
  id: string;
  icon: string | null;
};

/** 技能广场（SkillHub）公开技能 */
export type SquareSkill = {
  slug: string;
  displayName: string;
  summary: string | null;
  version: string | null;
  icon: string | null;
  category: string | null;
  tags: string[];
  downloads: number;
  stars: number;
  updatedAt: string | null;
  publisher: string | null;
  requiresApiKey: boolean;
  paid: boolean;
};

export type SquareCategory = {
  key: string;
  name: string;
};

/** 宿主拉取的公开菜单 */
export type HarnessMenuItem = {
  key: string;
  label: string;
  path?: string;
  children?: HarnessMenuItem[];
};

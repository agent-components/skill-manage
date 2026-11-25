import { z } from "zod";

/**
 * 工具元数据的唯一来源：名称、标题、说明、参数 schema 与 REST 映射。
 * MCP 直接消费 zod 参数；Harness 用 z.toJSONSchema 转成 JSON Schema。
 * 说明字段只描述用途，不出现参数含义，参数一律由 schema 表达。
 */
export type ToolRest = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
};

const pageParams = {
  current: z.number().int().min(1).default(1).describe("页码"),
  pageSize: z.number().int().min(1).max(100).default(20).describe("每页条数"),
};

const queryParam = z.string().optional().describe("关键词，匹配名称、标识或描述");
const skillRefParam = z.string().describe("技能 ID 或 slug");
const skillFilePathParam = z.string().optional().describe("包内相对路径，默认 SKILL.md");
const versionParam = z.string().optional().describe("版本号，默认最新版本");
const skillSetIdParam = z.string().describe("技能集 ID");

export const listSkillSetsTool = {
  name: "list_skill_sets",
  title: "列出技能集",
  description: "列出当前账号的技能集。",
  params: { ...pageParams, query: queryParam },
  rest: { method: "GET", path: "/api/openapi/skill-sets" },
} as const;

export const createSkillSetTool = {
  name: "create_skill_set",
  title: "创建技能集",
  description: "创建一个技能集。",
  params: {
    name: z.string().describe("技能集名称"),
    slug: z.string().optional().describe("标识，留空则根据名称生成"),
    description: z.string().optional().describe("描述"),
    icon: z
      .string()
      .optional()
      .describe("PNG data URL，以 data:image/png;base64, 开头"),
  },
  rest: { method: "POST", path: "/api/openapi/skill-sets" },
} as const;

export const updateSkillSetTool = {
  name: "update_skill_set",
  title: "修改技能集",
  description: "修改一个技能集，未传入的字段保持不变。",
  params: {
    id: skillSetIdParam,
    name: z.string().optional().describe("名称"),
    slug: z.string().optional().describe("标识"),
    description: z.string().optional().describe("描述，空字符串表示清空"),
    icon: z
      .string()
      .optional()
      .describe("PNG data URL，以 data:image/png;base64, 开头，空字符串表示清除"),
    skillIds: z
      .array(z.string())
      .optional()
      .describe("包含的技能，传入则整体替换，空数组表示全部解除，技能本身会保留"),
  },
  rest: { method: "PUT", path: "/api/openapi/skill-sets/{id}" },
} as const;

export const deleteSkillSetTool = {
  name: "delete_skill_set",
  title: "删除技能集",
  description: "删除一个技能集，并解除技能关联，技能本身会保留。",
  params: { id: skillSetIdParam },
  rest: { method: "DELETE", path: "/api/openapi/skill-sets/{id}" },
} as const;

export const listSkillsTool = {
  name: "list_skills",
  title: "列出技能",
  description: "列出当前账号的技能，不含文件内容。",
  params: {
    ...pageParams,
    query: queryParam,
    skillSet: z.string().optional().describe("技能集 slug，多个用英文逗号分隔"),
  },
  rest: { method: "GET", path: "/api/openapi/skills" },
} as const;

export const uploadSkillTool = {
  name: "upload_skill",
  title: "上传技能",
  description: "上传技能压缩包。",
  params: {
    filename: z
      .string()
      .describe("压缩包文件名，必须为 {slug}-{version}.zip，如 code-review-1.0.0.zip"),
    zipBase64: z.string().describe("zip 的 base64，可带 data URL 前缀"),
    skillSetIds: z.array(z.string()).optional().describe("上传后挂到这些技能集，可空"),
  },
  rest: { method: "POST", path: "/api/openapi/skills" },
} as const;

export const updateSkillTool = {
  name: "update_skill",
  title: "修改技能",
  description: "修改技能，未传入的字段保持不变。",
  params: {
    skill: skillRefParam,
    displayName: z.string().optional().describe("名称"),
    summary: z.string().optional().describe("描述，空字符串表示清空"),
    tags: z.array(z.string()).optional().describe("标签，传入则整体替换"),
    icon: z
      .string()
      .optional()
      .describe("PNG data URL，以 data:image/png;base64, 开头，空字符串表示清除"),
    skillSetIds: z
      .array(z.string())
      .optional()
      .describe("归属技能集，传入则整体替换，空数组表示全部解除"),
  },
  rest: { method: "PUT", path: "/api/openapi/skills/{skill}" },
} as const;

export const readSkillTool = {
  name: "read_skill",
  title: "阅读技能文件",
  description: "读取技能最新版本中的文本文件。",
  params: { skill: skillRefParam, path: skillFilePathParam },
  rest: { method: "GET", path: "/api/openapi/skills/{skill}" },
} as const;

export const listSkillFilesTool = {
  name: "list_skill_files",
  title: "列出技能文件",
  description: "列出技能最新版本包内的文件路径与大小，不返回文件内容。",
  params: { skill: skillRefParam },
  rest: { method: "GET", path: "/api/openapi/skills/{skill}/versions/files" },
} as const;

export const downloadSkillTool = {
  name: "download_skill",
  title: "下载技能压缩包",
  description: "获取技能的 zip 压缩包。",
  params: { skill: skillRefParam, version: versionParam },
  rest: { method: "GET", path: "/api/openapi/skills/{skill}/versions/download" },
} as const;

export const deleteSkillTool = {
  name: "delete_skill",
  title: "删除技能",
  description: "删除技能及其文件。",
  params: { skill: skillRefParam },
  rest: { method: "DELETE", path: "/api/openapi/skills/{skill}" },
} as const;

/** 全部工具，顺序即 Harness 输出的顺序。 */
export const TOOL_DEFINITIONS = [
  listSkillSetsTool,
  createSkillSetTool,
  updateSkillSetTool,
  deleteSkillSetTool,
  listSkillsTool,
  uploadSkillTool,
  updateSkillTool,
  readSkillTool,
  listSkillFilesTool,
  downloadSkillTool,
  deleteSkillTool,
] as const;

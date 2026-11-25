/** 宿主拉取的公开工具。path 相对本组件域名。 */
export type HarnessTool = {
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  headers: {
    name: string;
    description: string;
    required: boolean;
    schema: Record<string, unknown>;
  }[];
};

const pageProps = {
  current: {
    type: "integer",
    minimum: 1,
    default: 1,
    description: "页码",
  },
  pageSize: {
    type: "integer",
    minimum: 1,
    maximum: 100,
    default: 20,
    description: "每页条数",
  },
};

export const HARNESS_TOOLS: HarnessTool[] = [
  {
    name: "list_skill_sets",
    description: "列出当前账号的技能集。",
    method: "GET",
    path: "/api/openapi/skill-sets",
    headers: [],
    inputSchema: {
      type: "object",
      properties: {
        ...pageProps,
        name: { type: "string", description: "名称，模糊匹配" },
      },
    },
  },
  {
    name: "create_skill_set",
    description: "创建一个技能集。标识留空时根据名称生成。",
    method: "POST",
    path: "/api/openapi/skill-sets",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["name"],
      properties: {
        name: { type: "string", description: "技能集名称" },
        slug: { type: "string", description: "标识。留空则根据名称生成" },
        description: { type: "string", description: "描述" },
        icon: { type: "string", description: "PNG data URL，以 data:image/png;base64, 开头" },
      },
    },
  },
  {
    name: "update_skill_set",
    description: "修改一个技能集的名称、标识、描述、图标或包含的技能。未传入的字段保持不变。",
    method: "PUT",
    path: "/api/openapi/skill-sets/{id}",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能集 ID" },
        name: { type: "string", description: "名称" },
        slug: { type: "string", description: "标识" },
        description: { type: "string", description: "描述。空字符串表示清空" },
        icon: {
          type: "string",
          description: "PNG data URL，以 data:image/png;base64, 开头。空字符串表示清除",
        },
        skillIds: {
          type: "array",
          items: { type: "string" },
          description: "技能集包含的技能。传入则整体替换，空数组表示全部解除。技能本身会保留",
        },
      },
    },
  },
  {
    name: "delete_skill_set",
    description: "删除一个技能集，并解除技能关联。技能本身会保留。",
    method: "DELETE",
    path: "/api/openapi/skill-sets/{id}",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能集 ID" },
      },
    },
  },
  {
    name: "list_skills",
    description: "列出当前账号的技能。返回名称、描述和标签，不含文件内容。",
    method: "GET",
    path: "/api/openapi/skills",
    headers: [
      {
        name: "x-skill-set-id",
        description: "技能集 slug。多个用英文逗号隔开，只返回挂在这些技能集下的技能",
        required: false,
        schema: {
          type: "string",
          description: "技能集 slug，多个用英文逗号隔开",
        },
      },
    ],
    inputSchema: {
      type: "object",
      properties: {
        ...pageProps,
        name: { type: "string", description: "名称、标识或描述，模糊匹配" },
      },
    },
  },
  {
    name: "upload_skill",
    description: "上传技能压缩包。",
    method: "POST",
    path: "/api/openapi/skills",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["filename", "zipBase64"],
      properties: {
        filename: {
          type: "string",
          description: "压缩包文件名，必须为 {slug}-{version}.zip，如 code-review-1.0.0.zip",
        },
        zipBase64: {
          type: "string",
          description: "zip 的 base64，可带 data URL 前缀",
        },
        skillSetIds: {
          type: "array",
          items: { type: "string" },
          description: "上传后挂到这些技能集。可空",
        },
      },
    },
  },
  {
    name: "update_skill",
    description: "修改技能的名称、描述、标签、图标或归属技能集。未传入的字段保持不变。",
    method: "PUT",
    path: "/api/openapi/skills/{id}",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能 ID" },
        displayName: { type: "string", description: "名称" },
        summary: { type: "string", description: "描述。空字符串表示清空" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "标签。传入则整体替换",
        },
        icon: {
          type: "string",
          description: "PNG data URL，以 data:image/png;base64, 开头。空字符串表示清除",
        },
        skillSetIds: {
          type: "array",
          items: { type: "string" },
          description: "归属技能集。传入则整体替换，空数组表示全部解除",
        },
      },
    },
  },
  {
    name: "read_skill",
    description: "阅读技能。默认返回 SKILL.md，可用 path 读取包内其他文本文件。",
    method: "GET",
    path: "/api/openapi/skills/{id}",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能 ID" },
        path: {
          type: "string",
          description: "包内相对路径，默认 SKILL.md",
        },
      },
    },
  },
  {
    name: "list_skill_files",
    description: "列出技能里的文件。只返回路径和大小，不返回文件内容。",
    method: "GET",
    path: "/api/openapi/skills/{id}/versions/files",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能 ID" },
      },
    },
  },
  {
    name: "download_skill",
    description: "下载技能的 zip 压缩包。",
    method: "GET",
    path: "/api/openapi/skills/{id}/versions/download",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能 ID" },
      },
    },
  },
  {
    name: "delete_skill",
    description: "删除技能及其文件。",
    method: "DELETE",
    path: "/api/openapi/skills/{id}",
    headers: [],
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "string", description: "技能 ID" },
      },
    },
  },
];

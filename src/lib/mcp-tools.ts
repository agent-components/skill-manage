/** MCP 工具清单：令牌可选范围，与 registerTool 名称一致 */
export const MCP_TOOLS = [
  {
    id: "list",
    label: "列出技能",
    description: "列出当前项目里的技能，也可以按名称或描述搜索",
  },
  {
    id: "read",
    label: "阅读",
    description: "默认阅读 SKILL.md，也可以指定包内其他文本文件和版本",
  },
  {
    id: "download",
    label: "下载",
    description: "取得最新版本压缩包的临时链接，打开即可下载",
  },
  {
    id: "upload",
    label: "发布",
    description: "上传新技能，或为项目里已有技能发布新版本",
  },
  {
    id: "uninstall",
    label: "卸下",
    description: "把技能从当前项目移除，技能仍保留在技能库中",
  },
] as const;

export type McpToolId = (typeof MCP_TOOLS)[number]["id"];

export const ALL_MCP_TOOL_IDS: McpToolId[] = MCP_TOOLS.map((t) => t.id);

const TOOL_ID_SET = new Set<string>(ALL_MCP_TOOL_IDS);

export function isMcpToolId(value: string): value is McpToolId {
  return TOOL_ID_SET.has(value);
}

/** 空或缺省视为全部（兼容旧令牌） */
export function normalizeMcpTools(raw: unknown): McpToolId[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...ALL_MCP_TOOL_IDS];
  }
  const seen = new Set<McpToolId>();
  for (const item of raw) {
    if (typeof item === "string" && isMcpToolId(item)) seen.add(item);
  }
  return seen.size > 0 ? ALL_MCP_TOOL_IDS.filter((id) => seen.has(id)) : [...ALL_MCP_TOOL_IDS];
}

/** 校验创建/编辑入参；失败返回错误文案 */
export function parseMcpToolsInput(raw: unknown):
  | { ok: true; tools: McpToolId[] }
  | { ok: false; message: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, tools: [...ALL_MCP_TOOL_IDS] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, message: "工具列表格式错误" };
  }
  if (raw.length === 0) {
    return { ok: false, message: "请至少选择一个工具" };
  }
  const seen = new Set<McpToolId>();
  for (const item of raw) {
    if (typeof item !== "string" || !isMcpToolId(item)) {
      return { ok: false, message: `未知工具：${String(item)}` };
    }
    seen.add(item);
  }
  return {
    ok: true,
    tools: ALL_MCP_TOOL_IDS.filter((id) => seen.has(id)),
  };
}

export function mcpToolLabel(id: string) {
  return MCP_TOOLS.find((t) => t.id === id)?.label ?? id;
}

export function mcpToolDescription(id: string) {
  return MCP_TOOLS.find((t) => t.id === id)?.description ?? "";
}

export function isAllMcpTools(tools: string[]) {
  const normalized = normalizeMcpTools(tools);
  return normalized.length === ALL_MCP_TOOL_IDS.length;
}

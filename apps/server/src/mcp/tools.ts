import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { AuthUser } from "@skill-manage/shared";
import { listSkillSets } from "../modules/skill-sets/skill-set.service.js";
import {
  listSkillVersionFiles,
  listSkills,
  readSkillFile,
  resolveSkillRef,
  resolveSkillVersionForDownload,
} from "../modules/skills/skill.service.js";
import {
  createSkillDownloadLink,
  downloadLinkTtlMs,
} from "../modules/skills/download-link.service.js";
import { isAppError } from "../shared/errors.js";

export type McpRequestContext = {
  user: AuthUser;
  /** 拼接下载绝对链接用，如 https://example.com */
  baseUrl: string;
};

function textResult(data: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

function toolError(message: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** 业务错误转成工具错误；未知错误继续向上抛。 */
function toolCatch(error: unknown): CallToolResult {
  if (isAppError(error)) return toolError(error.message);
  throw error;
}

function splitSlugs(raw: string | undefined) {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const pageSchema = {
  current: z.number().int().min(1).optional().describe("页码，默认 1"),
  pageSize: z.number().int().min(1).max(100).optional().describe("每页条数，默认 20"),
};

export function registerSkillTools(server: McpServer, ctx: McpRequestContext) {
  server.registerTool(
    "list_skills",
    {
      title: "列出技能",
      description:
        "列出当前账号的技能，返回 ID、slug、名称、描述、标签与最新版本，不含文件内容。",
      inputSchema: {
        query: z.string().optional().describe("关键词，匹配名称、标识或描述"),
        skillSet: z.string().optional().describe("技能集 slug，多个用英文逗号分隔"),
        ...pageSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, skillSet, current, pageSize }) => {
      try {
        const data = await listSkills(
          ctx.user.id,
          { current, pageSize, name: query },
          splitSlugs(skillSet)
        );
        return textResult(data);
      } catch (error) {
        return toolCatch(error);
      }
    }
  );

  server.registerTool(
    "list_skill_sets",
    {
      title: "列出技能集",
      description: "列出当前账号的技能集，返回 ID、slug、名称、描述与技能数量。",
      inputSchema: {
        query: z.string().optional().describe("名称关键词"),
        ...pageSchema,
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ query, current, pageSize }) => {
      try {
        return textResult(await listSkillSets(ctx.user.id, { current, pageSize, name: query }));
      } catch (error) {
        return toolCatch(error);
      }
    }
  );

  server.registerTool(
    "read_skill",
    {
      title: "阅读技能文件",
      description:
        "返回技能最新版本中的文本文件内容，默认 SKILL.md，可用 path 读取包内其他文本文件。",
      inputSchema: {
        skill: z.string().describe("技能 ID 或 slug"),
        path: z.string().optional().describe("包内相对路径，默认 SKILL.md"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ skill, path }) => {
      try {
        const target = await resolveSkillRef(ctx.user.id, skill);
        const file = await readSkillFile(ctx.user.id, target.id, path ?? null);
        return textResult(file.content);
      } catch (error) {
        return toolCatch(error);
      }
    }
  );

  server.registerTool(
    "list_skill_files",
    {
      title: "列出技能文件",
      description: "列出技能最新版本包内的文件路径与大小，不返回文件内容。",
      inputSchema: {
        skill: z.string().describe("技能 ID 或 slug"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ skill }) => {
      try {
        const target = await resolveSkillRef(ctx.user.id, skill);
        return textResult(await listSkillVersionFiles(ctx.user.id, target.id));
      } catch (error) {
        return toolCatch(error);
      }
    }
  );

  server.registerTool(
    "download_skill",
    {
      title: "下载技能压缩包",
      description:
        "为技能版本生成临时下载短链，GET 该链接即可下载 zip，无需再带鉴权；链接过期自动失效。",
      inputSchema: {
        skill: z.string().describe("技能 ID 或 slug"),
        version: z.string().optional().describe("版本号，默认最新版本"),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ skill, version }) => {
      try {
        const { skill: target, version: ver } = await resolveSkillVersionForDownload(
          ctx.user.id,
          skill,
          version ?? null
        );
        const link = await createSkillDownloadLink({
          versionId: ver.id,
          createdBy: ctx.user.id,
        });
        return textResult({
          slug: target.slug,
          version: ver.version,
          filename: `${target.slug}-${ver.version}.zip`,
          mimeType: "application/zip",
          url: `${ctx.baseUrl}/api/d/${link.token}`,
          method: "GET",
          expiresAt: link.expiresAt.toISOString(),
          ttlSeconds: Math.round(downloadLinkTtlMs() / 1000),
          note: "短链无需鉴权，过期自动失效，请自行下载并解压。",
        });
      } catch (error) {
        return toolCatch(error);
      }
    }
  );
}

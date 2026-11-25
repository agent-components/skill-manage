import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
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
import {
  downloadSkillTool,
  listSkillFilesTool,
  listSkillsTool,
  listSkillSetsTool,
  readSkillTool,
} from "../shared/tool-definitions.js";
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

const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

export function registerSkillTools(server: McpServer, ctx: McpRequestContext) {
  server.registerTool(
    listSkillsTool.name,
    {
      title: listSkillsTool.title,
      description: listSkillsTool.description,
      inputSchema: listSkillsTool.params,
      annotations: READ_ONLY,
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
    listSkillSetsTool.name,
    {
      title: listSkillSetsTool.title,
      description: listSkillSetsTool.description,
      inputSchema: listSkillSetsTool.params,
      annotations: READ_ONLY,
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
    readSkillTool.name,
    {
      title: readSkillTool.title,
      description: readSkillTool.description,
      inputSchema: readSkillTool.params,
      annotations: READ_ONLY,
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
    listSkillFilesTool.name,
    {
      title: listSkillFilesTool.title,
      description: listSkillFilesTool.description,
      inputSchema: listSkillFilesTool.params,
      annotations: READ_ONLY,
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
    downloadSkillTool.name,
    {
      title: downloadSkillTool.title,
      description: downloadSkillTool.description,
      inputSchema: downloadSkillTool.params,
      annotations: READ_ONLY,
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

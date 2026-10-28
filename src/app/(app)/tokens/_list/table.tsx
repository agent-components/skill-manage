"use client";

import { useState } from "react";
import { Button, Space, Tag, Tooltip, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type {
  ListPageColumnComponentProps,
  TableConfig,
} from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import {
  ALL_MCP_TOOL_IDS,
  isAllMcpTools,
  mcpToolDescription,
  mcpToolLabel,
} from "@/lib/mcp-tools";
import { tokenFloatKeys } from "./floats";
import type { TokenFilter, TokenRow } from "./types";

function formatTime(value: string | null, empty: string) {
  if (!value) return empty;
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

function TokenValueCell({
  record,
  value,
}: ListPageColumnComponentProps<TokenRow, TokenFilter>) {
  const [copying, setCopying] = useState(false);
  const displayToken = String(value ?? record.displayToken);

  const onCopy = async () => {
    setCopying(true);
    try {
      const res = await authFetch(`/api/tokens/${record.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "复制失败");
      if (!data.token) throw new Error("未获取到令牌");
      await copyText(data.token as string);
      message.success("已复制令牌");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "复制失败");
    } finally {
      setCopying(false);
    }
  };

  return (
    <Space size={8}>
      <span
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {displayToken}
      </span>
      <a
        onClick={() => {
          if (!copying) void onCopy();
        }}
      >
        {copying ? "复制中…" : "复制"}
      </a>
    </Space>
  );
}

function TokenActions({
  record,
  ctx,
}: ListPageColumnComponentProps<TokenRow, TokenFilter>) {
  const [copyingMcp, setCopyingMcp] = useState(false);

  const onCopyMcp = async () => {
    setCopyingMcp(true);
    try {
      const res = await authFetch(`/api/tokens/${record.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "复制失败");
      if (!data.token) throw new Error("未获取到令牌");
      const serverKey = record.project?.slug
        ? `${record.project.slug}-skill`
        : "skill";
      const config = {
        mcpServers: {
          [serverKey]: {
            url: `${window.location.origin}/api/mcp`,
            headers: {
              Authorization: `Bearer ${data.token}`,
            },
          },
        },
      };
      await copyText(JSON.stringify(config, null, 2));
      message.success("已复制 MCP 配置");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "复制失败");
    } finally {
      setCopyingMcp(false);
    }
  };

  return (
    <Space>
      <a
        onClick={() => {
          if (!copyingMcp) void onCopyMcp();
        }}
      >
        {copyingMcp ? "复制中…" : "复制 MCP"}
      </a>
      <a onClick={() => ctx.showFloat(tokenFloatKeys.edit, record)}>编辑</a>
      <a
        onClick={() => ctx.showFloat(tokenFloatKeys.revoke, record)}
        style={{ color: "#ff4d4f" }}
      >
        撤销
      </a>
    </Space>
  );
}

export const tokenTable: TableConfig<TokenRow, TokenFilter> = {
  rowKey: "id",
  title: "令牌列表",
  extra: (ctx) => (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => ctx.showFloat(tokenFloatKeys.create)}
    >
      新建令牌
    </Button>
  ),
  columns: [
    { title: "名称", dataIndex: "name", width: 160 },
    {
      title: "项目",
      dataIndex: ["project", "name"],
      width: 140,
      render: (_: unknown, row: TokenRow) => row.project?.name || "-",
    },
    {
      title: "令牌",
      dataIndex: "displayToken",
      width: 240,
      component: (props) => <TokenValueCell key={props.record.id} {...props} />,
    },
    {
      title: "工具",
      dataIndex: "tools",
      width: 220,
      render: (value: string[] | undefined) => {
        const tools = value ?? [];
        const ids = isAllMcpTools(tools) ? ALL_MCP_TOOL_IDS : tools;
        if (isAllMcpTools(tools)) {
          return (
            <Tooltip
              title={
                <div>
                  {ALL_MCP_TOOL_IDS.map((id) => (
                    <div key={id}>
                      {mcpToolLabel(id)}：{mcpToolDescription(id)}
                    </div>
                  ))}
                </div>
              }
            >
              <Tag>全部</Tag>
            </Tooltip>
          );
        }
        return (
          <Space size={[4, 4]} wrap>
            {ids.map((id) => (
              <Tooltip key={id} title={mcpToolDescription(id)}>
                <Tag>{mcpToolLabel(id)}</Tag>
              </Tooltip>
            ))}
          </Space>
        );
      },
    },
    {
      title: "最近使用",
      dataIndex: "lastUsedAt",
      width: 160,
      render: (value: string | null) => formatTime(value, "从未使用"),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      width: 160,
      render: (value: string) => formatTime(value, "-"),
    },
    {
      title: "操作",
      width: 200,
      component: (props) => <TokenActions {...props} />,
    },
  ],
};

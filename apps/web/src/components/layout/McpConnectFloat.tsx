import { useMemo } from "react";
import { Button, Modal, Typography, message } from "antd";
import { getClientToken } from "@/services";

/** MCP 服务地址：优先 VITE_MCP_URL，否则用当前站点同源的 /mcp。 */
function mcpEndpoint() {
  const configured = import.meta.env.VITE_MCP_URL?.trim();
  if (configured) return configured;
  if (typeof window === "undefined") return "/mcp";
  return `${window.location.origin}/mcp`;
}

/** Agent 接入 MCP 的标准配置片段，直接带上当前登录凭证。 */
function buildMcpConfig() {
  return {
    mcpServers: {
      "skill-manage": {
        type: "http",
        url: mcpEndpoint(),
        headers: {
          Authorization: `Bearer ${getClientToken() ?? ""}`,
        },
      },
    },
  };
}

export function McpConnectFloat({ open, onClose }: { open: boolean; onClose: () => void }) {
  // 每次打开重新读取 token 与地址，避免展示过期凭证
  const config = useMemo(() => JSON.stringify(buildMcpConfig(), null, 2), [open]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(config);
      message.success("已复制 MCP 配置");
    } catch {
      message.error("复制失败，请手动选择文本复制");
    }
  };

  return (
    <Modal
      title="接入 MCP"
      open={open}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="copy" type="primary" onClick={() => void onCopy()}>
          复制配置
        </Button>,
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
      ]}
    >
      <Typography.Paragraph type="secondary">
        将下面的 JSON 加入支持 MCP 的 Agent 配置（如 Claude Code、Cursor），保存后即可调用技能管理工具。配置中已带上当前登录凭证，凭证失效后重新打开本弹窗复制即可。
      </Typography.Paragraph>
      <pre
        style={{
          margin: 0,
          maxHeight: 360,
          overflow: "auto",
          padding: 12,
          borderRadius: 6,
          background: "rgba(0, 0, 0, 0.04)",
          fontSize: 12,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {config}
      </pre>
    </Modal>
  );
}

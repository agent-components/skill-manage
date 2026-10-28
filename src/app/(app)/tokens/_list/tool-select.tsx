"use client";

import { Checkbox, Tooltip } from "antd";
import { MCP_TOOLS } from "@/lib/mcp-tools";

type Props = {
  value?: string[];
  onChange?: (value: string[]) => void;
};

export function TokenToolSelect({ value = [], onChange }: Props) {
  return (
    <Checkbox.Group
      value={value}
      onChange={(next) => onChange?.(next as string[])}
      options={MCP_TOOLS.map((t) => ({
        value: t.id,
        label: (
          <Tooltip title={t.description}>
            <span>{t.label}</span>
          </Tooltip>
        ),
      }))}
      style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px" }}
    />
  );
}

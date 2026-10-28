"use client";

import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { ProjectSelect } from "@/components/project-options";
import { authFetch } from "@/lib/auth-client";
import { ALL_MCP_TOOL_IDS } from "@/lib/mcp-tools";
import { TokenToolSelect } from "./tool-select";
import type { TokenRow } from "./types";

export function CreateTokenFloat({
  visible,
  onClose,
}: FloatComponentProps<TokenRow>) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      const res = await authFetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          projectId: values.projectId,
          tools: values.tools,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "创建失败");
      message.success("已创建令牌");
      onClose(true);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="新建令牌"
      open={visible}
      onCancel={() => onClose()}
      onOk={onCreate}
      confirmLoading={saving}
      okText="创建"
      afterClose={() => form.resetFields()}
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{ tools: [...ALL_MCP_TOOL_IDS] }}
      >
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入令牌名称" }]}
        >
          <Input placeholder="例如：CI 发布" maxLength={64} />
        </Form.Item>
        <Form.Item
          name="projectId"
          label="绑定项目"
          rules={[{ required: true, message: "请选择绑定项目" }]}
        >
          <ProjectSelect placeholder="请选择项目" showSearch />
        </Form.Item>
        <Form.Item
          name="tools"
          label="可用工具"
          rules={[
            {
              type: "array",
              min: 1,
              message: "请至少选择一个工具",
            },
          ]}
        >
          <TokenToolSelect />
        </Form.Item>
      </Form>
    </Modal>
  );
}

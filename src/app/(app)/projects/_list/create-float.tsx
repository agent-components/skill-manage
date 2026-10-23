"use client";

import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import type { ProjectRow } from "./types";

export function CreateProjectFloat({
  visible,
  onClose,
}: FloatComponentProps<ProjectRow>) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await authFetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "创建失败");
      message.success("已创建项目");
      onClose(true);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="新建项目"
      open={visible}
      onCancel={() => onClose()}
      onOk={onCreate}
      confirmLoading={saving}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="项目名称" />
        </Form.Item>
        <Form.Item name="slug" label="Slug" extra="留空则根据名称自动生成">
          <Input placeholder="可选" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

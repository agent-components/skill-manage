"use client";

import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { SkillSetIconInput } from "@/components/icons";
import { authFetch } from "@/lib/auth-client";
import type { SkillSetRow } from "./types";

export function CreateSkillSetFloat({
  visible,
  onClose,
}: FloatComponentProps<SkillSetRow>) {
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
      message.success("已创建技能集");
      onClose(true);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="新建技能集"
      open={visible}
      onCancel={() => onClose()}
      onOk={onCreate}
      confirmLoading={saving}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item name="icon">
          <SkillSetIconInput />
        </Form.Item>
        <Form.Item
          name="name"
          label="名称"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="技能集名称" />
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

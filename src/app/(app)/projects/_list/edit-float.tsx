"use client";

import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { SkillSetIconInput } from "@/components/icons";
import { authFetch } from "@/lib/auth-client";
import type { SkillSetRow } from "./types";

export function EditSkillSetFloat({
  record,
  visible,
  onClose,
}: FloatComponentProps<SkillSetRow>) {
  if (!record) return null;
  return (
    <EditSkillSetForm
      key={record.id}
      record={record}
      visible={visible}
      onClose={onClose}
    />
  );
}

function EditSkillSetForm({
  record,
  visible,
  onClose,
}: {
  record: SkillSetRow;
  visible: boolean;
  onClose: FloatComponentProps<SkillSetRow>["onClose"];
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/projects/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          slug: values.slug,
          description: values.description ?? "",
          icon: values.icon ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "保存失败");
      message.success("已保存");
      onClose(true);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="编辑技能集"
      open={visible}
      onCancel={() => {
        if (!saving) onClose();
      }}
      onOk={onSave}
      confirmLoading={saving}
      okText="保存"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{
          name: record.name,
          slug: record.slug,
          description: record.description ?? "",
          icon: record.icon,
        }}
      >
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
        <Form.Item
          name="slug"
          label="Slug"
          rules={[{ required: true, message: "请输入 Slug" }]}
        >
          <Input placeholder="技能集标识" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

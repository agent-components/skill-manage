"use client";

import { useState } from "react";
import { Form, Input, Modal, Select, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { ProjectSelect } from "@/components/project-options";
import { authFetch } from "@/lib/auth-client";
import type { SkillRow } from "./types";

export function EditSkillFloat({
  record,
  visible,
  onClose,
}: FloatComponentProps<SkillRow>) {
  if (!record) return null;
  return (
    <EditSkillForm
      key={record.id}
      record={record}
      visible={visible}
      onClose={onClose}
    />
  );
}

function EditSkillForm({
  record,
  visible,
  onClose,
}: {
  record: SkillRow;
  visible: boolean;
  onClose: FloatComponentProps<SkillRow>["onClose"];
}) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      const res = await authFetch(`/api/skills/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: values.displayName,
          summary: values.summary ?? "",
          tags: values.tags ?? [],
          projectIds: values.projectIds ?? [],
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
      title="编辑技能"
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
          displayName: record.displayName,
          summary: record.summary ?? "",
          tags: record.tags ?? [],
          projectIds: record.projects.map((p) => p.id),
        }}
      >
        <Form.Item
          name="displayName"
          label="名称"
          rules={[{ required: true, message: "请输入名称" }]}
        >
          <Input placeholder="技能名称" />
        </Form.Item>
        <Form.Item name="summary" label="描述">
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
        <Form.Item name="tags" label="标签">
          <Select
            mode="tags"
            allowClear
            placeholder="输入后回车添加"
            tokenSeparators={[",", "，"]}
          />
        </Form.Item>
        <Form.Item name="projectIds" label="归属项目">
          <ProjectSelect mode="multiple" placeholder="可选，可多选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

import { useState } from "react";
import { Form, Input, Modal, Select, message } from "antd";
import { SkillSetIconInput } from "@/components/icons";
import { SkillSetSelect } from "@/components/skill-set-options";
import { useTRPCClient } from "@/lib/trpc";
import { errorMessage } from "@/lib/error";
import type { SkillRow } from "@/features/skills/types";

export function EditSkillFloat({
  record,
  visible,
  onClose,
}: {
  record?: SkillRow;
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
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
  onClose: (refresh?: unknown) => void;
}) {
  const trpc = useTRPCClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      await trpc.skill.update.mutate({
        id: record.id,
        displayName: values.displayName,
        summary: values.summary ?? "",
        tags: values.tags ?? [],
        skillSetIds: values.skillSetIds ?? [],
        icon: values.icon ?? null,
      });
      message.success("已保存");
      onClose(true);
    } catch (e) {
      message.error(errorMessage(e, "保存失败"));
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
      cancelText="取消"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 16 }}
        initialValues={{
          icon: record.icon,
          displayName: record.displayName,
          summary: record.summary ?? "",
          tags: record.tags ?? [],
          skillSetIds: record.skillSets.map((item) => item.id),
        }}
      >
        <Form.Item name="icon">
          <SkillSetIconInput fallback="skill" />
        </Form.Item>
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
        <Form.Item name="skillSetIds" label="归属技能集">
          <SkillSetSelect mode="multiple" placeholder="可选，可多选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

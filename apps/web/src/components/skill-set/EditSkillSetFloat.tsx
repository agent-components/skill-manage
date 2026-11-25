import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import { SkillSetIconInput } from "@/components/ui";
import { useTRPCClient } from "@/services/trpc";
import { errorMessage } from "@/utils";
import type { SkillSetRow } from "@/types";

export function EditSkillSetFloat({
  record,
  visible,
  onClose,
}: {
  record?: SkillSetRow;
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
  if (!record) return null;
  return <EditSkillSetForm key={record.id} record={record} visible={visible} onClose={onClose} />;
}

function EditSkillSetForm({
  record,
  visible,
  onClose,
}: {
  record: SkillSetRow;
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
      await trpc.skillSet.update.mutate({
        id: record.id,
        name: values.name,
        slug: values.slug,
        description: values.description ?? "",
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
      title="编辑技能集"
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
          name: record.name,
          slug: record.slug,
          description: record.description ?? "",
          icon: record.icon,
        }}
      >
        <Form.Item name="icon">
          <SkillSetIconInput />
        </Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: "请输入名称" }]}>
          <Input placeholder="技能集名称" />
        </Form.Item>
        <Form.Item name="slug" label="Slug" rules={[{ required: true, message: "请输入 Slug" }]}>
          <Input placeholder="技能集标识" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={3} placeholder="可选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

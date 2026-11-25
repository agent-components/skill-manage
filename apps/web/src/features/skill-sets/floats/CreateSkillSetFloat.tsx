import { useState } from "react";
import { Form, Input, Modal, message } from "antd";
import { SkillSetIconInput } from "@/components/icons";
import { useTRPCClient } from "@/lib/trpc";
import { errorMessage } from "@/lib/error";
import type { SkillSetRow } from "@/features/types";

export function CreateSkillSetFloat({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
  const trpc = useTRPCClient();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      await trpc.skillSet.create.mutate({
        name: values.name,
        slug: values.slug || undefined,
        description: values.description,
        icon: values.icon ?? null,
      });
      message.success("已创建技能集");
      onClose(true);
    } catch (e) {
      message.error(errorMessage(e, "创建失败"));
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

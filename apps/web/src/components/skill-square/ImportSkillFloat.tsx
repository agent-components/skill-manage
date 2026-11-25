import { useEffect, useState } from "react";
import { Form, Modal, message } from "antd";
import { SkillSetSelect } from "@/components/skill-set/SkillSetSelect";
import { useTRPCClient } from "@/services/trpc/provider";
import { errorMessage } from "@/utils/error";
import type { SquareSkill } from "@/types/skill-square";

export function ImportSkillFloat({
  record,
  visible,
  onClose,
}: {
  record?: SquareSkill;
  visible: boolean;
  onClose: () => void;
}) {
  const trpc = useTRPCClient();
  const [form] = Form.useForm();
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (visible) form.resetFields();
  }, [visible, record?.slug, form]);

  const onImport = async () => {
    if (!record) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setImporting(true);
    try {
      const data = await trpc.skillSquare.import.mutate({
        slug: record.slug,
        skillSetIds: values.skillSetIds || [],
      });
      message.success(`已导入 ${data.displayName} @ ${data.version}`);
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(errorMessage(error, "导入失败"));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      title="导入技能"
      open={visible}
      onCancel={() => {
        if (!importing) onClose();
      }}
      onOk={onImport}
      confirmLoading={importing}
      okText="导入"
      width={560}
    >
      <p style={{ marginTop: 8, marginBottom: 16, color: "rgba(0,0,0,0.65)" }}>
        {record
          ? `将「${record.displayName}」${record.version ? ` ${record.version}` : ""} 导入到自己的技能里。`
          : "选择要导入的技能。"}
      </p>
      <Form form={form} layout="vertical">
        <Form.Item name="skillSetIds" label="归属技能集">
          <SkillSetSelect mode="multiple" placeholder="可选，可多选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

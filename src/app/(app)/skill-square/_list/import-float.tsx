"use client";

import { useEffect, useState } from "react";
import { Form, Modal, message } from "antd";
import { SkillSetSelect } from "@/components/skill-set-options";
import { authFetch } from "@/lib/auth-client";
import type { SquareSkill } from "./types";

export function ImportSkillFloat({
  record,
  visible,
  onClose,
}: {
  record?: SquareSkill;
  visible: boolean;
  onClose: () => void;
}) {
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
      const res = await authFetch("/api/openapi/skill-square/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: record.slug,
          skillSetIds: values.skillSetIds || [],
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "导入失败");
      message.success(`已导入 ${data.displayName} @ ${data.version}`);
      form.resetFields();
      onClose();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "导入失败");
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

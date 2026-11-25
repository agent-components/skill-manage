import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Modal, message } from "antd";
import { extractVersionFromFilename } from "@skill-manage/shared";
import { SkillSetSelect } from "@/components/skill-set";
import { ZipUpload } from "@/components/skill";
import { fileToBase64 } from "@/utils";
import { useTRPCClient } from "@/services/trpc";
import { errorMessage } from "@/utils";
import type { SkillRow } from "@/types";

export function UploadSkillFloat({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
  const navigate = useNavigate();
  const trpc = useTRPCClient();
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const onUpload = async () => {
    if (!file) {
      message.warning("请先选择 ZIP 文件");
      return;
    }
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setUploading(true);
    try {
      const zipBase64 = await fileToBase64(file);
      const data = await trpc.skill.uploadBase64.mutate({
        filename: file.name,
        zipBase64,
        skillSetIds: values.skillSetIds ?? [],
        fallbackVersion: values.version ?? undefined,
      });
      message.success(`已上传 ${data.displayName} @ ${data.version}`);
      onClose(true);
      navigate(`/skills/${data.id}`);
    } catch (e) {
      message.error(errorMessage(e, "上传失败"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      title="上传技能"
      open={visible}
      onCancel={() => {
        if (!uploading) onClose();
      }}
      onOk={onUpload}
      confirmLoading={uploading}
      okText="上传"
      width={560}
    >
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <ZipUpload
          file={file}
          disabled={uploading}
          onFileSelect={(f) => {
            setFile(f);
            if (f) {
              const fromName = extractVersionFromFilename(f.name);
              if (fromName) form.setFieldsValue({ version: fromName });
              message.info(`已选择 ${f.name}`);
            }
          }}
        />
      </div>
      <Form form={form} layout="vertical">
        <Form.Item
          name="version"
          label="版本"
          extra="可从文件名识别（如 agent-browser-0.1.0.zip）；也可在 SKILL.md 或此处填写"
        >
          <Input placeholder="如 0.1.0" />
        </Form.Item>
        <Form.Item name="skillSetIds" label="归属技能集">
          <SkillSetSelect mode="multiple" placeholder="可选，可多选" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

"use client";

import { InboxOutlined } from "@ant-design/icons";
import { Upload, type UploadFile, type UploadProps } from "antd";

const { Dragger } = Upload;

/** Ant Design Dragger for selecting a single ZIP skill package. */
export function ZipUpload({
  file,
  disabled,
  onFileSelect,
}: {
  file: File | null;
  disabled?: boolean;
  onFileSelect: (file: File | null) => void;
}) {
  const fileList: UploadFile[] = file
    ? [
        {
          uid: "-1",
          name: file.name,
          status: "done",
          size: file.size,
        },
      ]
    : [];

  const props: UploadProps = {
    accept: ".zip,application/zip",
    maxCount: 1,
    multiple: false,
    disabled,
    fileList,
    beforeUpload: (f) => {
      onFileSelect(f);
      return false;
    },
    onRemove: () => {
      onFileSelect(null);
    },
  };

  return (
    <Dragger {...props}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">拖拽技能到此处，或点击选择</p>
      <p className="ant-upload-hint">仅支持 .zip，根目录需包含 SKILL.md</p>
    </Dragger>
  );
}

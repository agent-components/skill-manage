"use client";

import { useState } from "react";
import { Modal, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import type { SkillRow } from "./types";

export function DeleteSkillFloat({
  record,
  visible,
  onClose,
}: FloatComponentProps<SkillRow>) {
  const [deleting, setDeleting] = useState(false);
  if (!record) return null;

  const onDelete = async () => {
    setDeleting(true);
    try {
      const res = await authFetch(`/api/skills/${record.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.error(data.message || "删除失败");
        return;
      }
      message.success("已删除");
      onClose(true);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      title="删除技能？"
      open={visible}
      onCancel={() => {
        if (!deleting) onClose();
      }}
      onOk={onDelete}
      confirmLoading={deleting}
      okText="删除"
      okType="danger"
      cancelText="取消"
    >
      {`将删除「${record.displayName}」的所有版本与对象存储中的文件，不可恢复。`}
    </Modal>
  );
}

import { useState } from "react";
import { Modal, message } from "antd";
import { useTRPCClient } from "@/lib/trpc";
import { errorMessage } from "@/lib/error";
import type { SkillRow } from "@/features/skills/types";

export function DeleteSkillFloat({
  record,
  visible,
  onClose,
}: {
  record?: SkillRow;
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
  const trpc = useTRPCClient();
  const [deleting, setDeleting] = useState(false);

  if (!record) return null;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await trpc.skill.remove.mutate({ id: record.id });
      message.success("已删除");
      onClose(true);
    } catch (e) {
      message.error(errorMessage(e, "删除失败"));
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

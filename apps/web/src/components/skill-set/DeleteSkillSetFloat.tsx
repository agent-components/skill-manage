import { useState } from "react";
import { Modal, message } from "antd";
import { useTRPCClient } from "@/services/trpc";
import { errorMessage } from "@/utils";
import type { SkillSetRow } from "@/types";

export function DeleteSkillSetFloat({
  record,
  visible,
  onClose,
}: {
  record?: SkillSetRow;
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
  const trpc = useTRPCClient();
  const [deleting, setDeleting] = useState(false);

  if (!record) return null;

  const onDelete = async () => {
    setDeleting(true);
    try {
      await trpc.skillSet.remove.mutate({ id: record.id });
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
      title="删除技能集？"
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
      {`将删除「${record.name}」，并解除技能关联。技能本身会保留。`}
    </Modal>
  );
}

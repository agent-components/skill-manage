"use client";

import { useState } from "react";
import { Modal, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import type { TokenRow } from "./types";

export function RevokeTokenFloat({
  record,
  visible,
  onClose,
}: FloatComponentProps<TokenRow>) {
  const [revoking, setRevoking] = useState(false);
  if (!record) return null;

  const onRevoke = async () => {
    setRevoking(true);
    try {
      const res = await authFetch(`/api/tokens/${record.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        message.error(data.message || "撤销失败");
        return;
      }
      message.success("已撤销");
      onClose(true);
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Modal
      title="撤销令牌？"
      open={visible}
      onCancel={() => {
        if (!revoking) onClose();
      }}
      onOk={onRevoke}
      confirmLoading={revoking}
      okText="撤销"
      okType="danger"
      cancelText="取消"
    >
      {`撤销后「${record.name}」将立即失效，且不可恢复。`}
    </Modal>
  );
}

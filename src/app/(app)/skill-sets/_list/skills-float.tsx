"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer, Table, Tooltip, Typography, message } from "antd";
import type { FloatComponentProps } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import type { SkillSetRow } from "./types";

type LinkedSkill = {
  id: string;
  slug: string;
  displayName: string;
  summary: string | null;
  latestVersion: string | null;
  versionCount: number;
};

export function SkillSetSkillsFloat({
  record,
  visible,
  onClose,
}: FloatComponentProps<SkillSetRow>) {
  if (!record) return null;
  return (
    <SkillSetSkillsDrawer
      key={record.id}
      record={record}
      visible={visible}
      onClose={onClose}
    />
  );
}

function SkillSetSkillsDrawer({
  record,
  visible,
  onClose,
}: {
  record: SkillSetRow;
  visible: boolean;
  onClose: FloatComponentProps<SkillSetRow>["onClose"];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<LinkedSkill[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/openapi/skill-sets/${record.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "加载失败");
      setSkills(data.skills || []);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [record.id]);

  useEffect(() => {
    if (!visible) return;
    void load();
  }, [visible, load]);

  return (
    <Drawer
      title={`${record.name} · 关联技能`}
      open={visible}
      onClose={() => onClose()}
      width={720}
      destroyOnHidden
    >
      <Table
        rowKey="id"
        loading={loading}
        dataSource={skills}
        pagination={false}
        locale={{ emptyText: "暂无关联技能" }}
        columns={[
          {
            title: "名称",
            dataIndex: "displayName",
            ellipsis: true,
            render: (v: string, row: LinkedSkill) => (
              <Tooltip title={v}>
                <Typography.Link
                  ellipsis
                  onClick={() => router.push(`/skills/${row.id}`)}
                >
                  {v}
                </Typography.Link>
              </Tooltip>
            ),
          },
          {
            title: "Slug",
            dataIndex: "slug",
            width: 160,
            ellipsis: { showTitle: false },
            render: (v: string) => (
              <Typography.Text ellipsis={{ tooltip: v }}>{v}</Typography.Text>
            ),
          },
          {
            title: "最新版本",
            dataIndex: "latestVersion",
            width: 120,
            render: (v: string | null) => v || "-",
          },
          {
            title: "操作",
            width: 80,
            render: (_: unknown, row: LinkedSkill) => (
              <a onClick={() => router.push(`/skills/${row.id}`)}>查看</a>
            ),
          },
        ]}
      />
    </Drawer>
  );
}

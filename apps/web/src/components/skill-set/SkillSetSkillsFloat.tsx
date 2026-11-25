import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Drawer, Table, Tooltip, Typography } from "antd";
import { useTRPC } from "@/services/trpc";
import type { SkillSetRow } from "@/types";

export function SkillSetSkillsFloat({
  record,
  visible,
  onClose,
}: {
  record?: SkillSetRow;
  visible: boolean;
  onClose: (refresh?: unknown) => void;
}) {
  const navigate = useNavigate();
  const trpc = useTRPC();

  const query = useQuery(
    trpc.skillSet.detail.queryOptions(
      { id: record?.id ?? "" },
      { enabled: Boolean(visible && record?.id) }
    )
  );

  if (!record) return null;

  const skills = query.data?.skills ?? [];

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
        loading={query.isFetching}
        dataSource={skills}
        pagination={false}
        locale={{ emptyText: "暂无关联技能" }}
        columns={[
          {
            title: "名称",
            dataIndex: "displayName",
            ellipsis: true,
            render: (v: string, row) => (
              <Tooltip title={v}>
                <Typography.Link ellipsis onClick={() => navigate(`/skills/${row.id}`)}>
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
            render: (v: string) => <Typography.Text ellipsis={{ tooltip: v }}>{v}</Typography.Text>,
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
            render: (_: unknown, row) => <a onClick={() => navigate(`/skills/${row.id}`)}>查看</a>,
          },
        ]}
      />
    </Drawer>
  );
}

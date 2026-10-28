"use client";

import { useRouter } from "next/navigation";
import { Button, Space, Tag, Typography } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import type {
  ListPageColumnComponentProps,
  TableConfig,
} from "listpage-components/ListPage";
import { skillFloatKeys } from "./floats";
import type { SkillFilter, SkillRow } from "./types";

function SkillNameCell({
  record,
}: ListPageColumnComponentProps<SkillRow, SkillFilter>) {
  const router = useRouter();
  return (
    <Typography.Link
      ellipsis={{ tooltip: record.displayName }}
      onClick={() => router.push(`/skills/${record.id}`)}
    >
      {record.displayName}
    </Typography.Link>
  );
}

function SkillActions({
  record,
  ctx,
}: ListPageColumnComponentProps<SkillRow, SkillFilter>) {
  const router = useRouter();
  return (
    <Space>
      <a onClick={() => router.push(`/skills/${record.id}`)}>详情</a>
      <a onClick={() => ctx.showFloat(skillFloatKeys.edit, record)}>编辑</a>
      <a
        onClick={() => ctx.showFloat(skillFloatKeys.delete, record)}
        style={{ color: "#ff4d4f" }}
      >
        删除
      </a>
    </Space>
  );
}

export const skillTable: TableConfig<SkillRow, SkillFilter> = {
  rowKey: "id",
  title: "技能列表",
  extra: (ctx) => (
    <Button
      type="primary"
      icon={<UploadOutlined />}
      onClick={() => ctx.showFloat(skillFloatKeys.upload)}
    >
      上传技能包
    </Button>
  ),
  columns: [
    {
      title: "名称",
      dataIndex: "displayName",
      width: 200,
      ellipsis: true,
      component: (props) => <SkillNameCell {...props} />,
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
      title: "描述",
      dataIndex: "summary",
      valueType: "text",
      ellipsis: { showTitle: false },
      render: (v: string | null) =>
        v ? (
          <Typography.Text ellipsis={{ tooltip: v }}>{v}</Typography.Text>
        ) : (
          "-"
        ),
    },
    {
      title: "标签",
      dataIndex: "tags",
      width: 200,
      render: (tags: string[] | undefined) =>
        tags?.length
          ? tags.map((tag) => (
            <Tag key={tag} style={{ marginBottom: 2 }}>
              {tag}
            </Tag>
          ))
          : "-",
    },
    {
      title: "最新版本",
      dataIndex: "latestVersion",
      width: 120,
      render: (v: string | null) => v || "-",
    },
    {
      title: "项目",
      dataIndex: "projects",
      width: 200,
      render: (ps: SkillRow["projects"]) =>
        ps?.length
          ? ps.map((p) => (
            <Tag key={p.id} style={{ marginBottom: 2 }}>
              {p.name}
            </Tag>
          ))
          : "-",
    },
    {
      title: "操作",
      width: 180,
      component: (props) => <SkillActions {...props} />,
    },
  ],
};

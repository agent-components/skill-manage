"use client";

import { useRouter } from "next/navigation";
import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type {
  ListPageColumnComponentProps,
  TableConfig,
} from "listpage-components/ListPage";
import { projectFloatKeys } from "./floats";
import type { ProjectFilter, ProjectRow } from "./types";

function ProjectActions({
  record,
}: ListPageColumnComponentProps<ProjectRow, ProjectFilter>) {
  const router = useRouter();
  return (
    <Space>
      <a onClick={() => router.push(`/projects/${record.id}`)}>详情</a>
    </Space>
  );
}

export const projectTable: TableConfig<ProjectRow, ProjectFilter> = {
  rowKey: "id",
  title: "项目列表",
  extra: (ctx) => (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => ctx.showFloat(projectFloatKeys.create)}
    >
      新建项目
    </Button>
  ),
  columns: [
    { title: "名称", dataIndex: "name", width: 200 },
    { title: "Slug", dataIndex: "slug", width: 160 },
    { title: "描述", dataIndex: "description" },
    { title: "技能数", dataIndex: "skillCount", width: 90 },
    {
      title: "操作",
      width: 100,
      component: (props) => <ProjectActions {...props} />,
    },
  ],
};

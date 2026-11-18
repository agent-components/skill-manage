"use client";

import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import type {
  ListPageColumnComponentProps,
  TableConfig,
} from "listpage-components/ListPage";
import { skillSetFloatKeys } from "./floats";
import type { SkillSetFilter, SkillSetRow } from "./types";

function SkillSetActions({
  record,
  ctx,
}: ListPageColumnComponentProps<SkillSetRow, SkillSetFilter>) {
  return (
    <Space>
      <a onClick={() => ctx.showFloat(skillSetFloatKeys.skills, record)}>
        关联技能
      </a>
      <a onClick={() => ctx.showFloat(skillSetFloatKeys.edit, record)}>编辑</a>
      <a
        onClick={() => ctx.showFloat(skillSetFloatKeys.delete, record)}
        style={{ color: "#ff4d4f" }}
      >
        删除
      </a>
    </Space>
  );
}

export const skillSetTable: TableConfig<SkillSetRow, SkillSetFilter> = {
  rowKey: "id",
  title: "技能集列表",
  extra: (ctx) => (
    <Button
      type="primary"
      icon={<PlusOutlined />}
      onClick={() => ctx.showFloat(skillSetFloatKeys.create)}
    >
      新建技能集
    </Button>
  ),
  columns: [
    { title: "名称", dataIndex: "name", width: 200 },
    { title: "Slug", dataIndex: "slug", width: 160 },
    { title: "描述", dataIndex: "description" },
    { title: "技能数", dataIndex: "skillCount", width: 90 },
    {
      title: "操作",
      width: 220,
      component: (props) => <SkillSetActions {...props} />,
    },
  ],
};

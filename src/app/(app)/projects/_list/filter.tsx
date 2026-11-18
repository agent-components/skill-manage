"use client";

import { Input } from "antd";
import type { FilterConfig } from "listpage-components/ListPage";
import type { SkillSetFilter } from "./types";

export const skillSetFilter: FilterConfig<SkillSetFilter> = {
  items: [
    {
      name: "name",
      label: "名称",
      component: <Input allowClear placeholder="技能集名称" />,
    },
  ],
};

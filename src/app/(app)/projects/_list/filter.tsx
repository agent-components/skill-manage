"use client";

import { Input } from "antd";
import type { FilterConfig } from "listpage-components/ListPage";
import type { ProjectFilter } from "./types";

export const projectFilter: FilterConfig<ProjectFilter> = {
  items: [
    {
      name: "name",
      label: "名称",
      component: <Input allowClear placeholder="项目名称" />,
    },
  ],
};

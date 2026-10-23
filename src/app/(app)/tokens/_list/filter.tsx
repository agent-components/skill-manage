"use client";

import { Input } from "antd";
import type { FilterConfig } from "listpage-components/ListPage";
import { ProjectSelect } from "@/components/project-options";
import type { TokenFilter } from "./types";

export const tokenFilter: FilterConfig<TokenFilter> = {
  items: [
    {
      name: "name",
      label: "名称",
      component: <Input allowClear placeholder="令牌名称" />,
    },
    {
      name: "projectId",
      label: "项目",
      component: <ProjectSelect placeholder="全部项目" />,
    },
  ],
};

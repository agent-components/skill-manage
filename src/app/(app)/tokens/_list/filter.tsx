"use client";

import { Input } from "antd";
import type { FilterConfig } from "listpage-components/ListPage";
import { SkillSetSelect } from "@/components/skill-set-options";
import type { TokenFilter } from "./types";

export const tokenFilter: FilterConfig<TokenFilter> = {
  items: [
    {
      name: "name",
      label: "名称",
      component: <Input allowClear placeholder="令牌名称" />,
    },
    {
      name: "skillSetId",
      label: "技能集",
      component: <SkillSetSelect placeholder="全部技能集" />,
    },
  ],
};

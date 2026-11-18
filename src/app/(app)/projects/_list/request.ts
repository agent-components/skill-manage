"use client";

import type { ListPageRequest } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import type { SkillSetFilter, SkillSetRow } from "./types";

export const requestSkillSets: ListPageRequest<SkillSetFilter> = async (
  pageParams,
  filterValues,
) => {
  const qs = new URLSearchParams();
  if (filterValues?.name) qs.set("name", filterValues.name);
  qs.set("page", String(pageParams.current || 1));
  qs.set("pageSize", String(pageParams.pageSize || 20));
  const res = await authFetch(`/api/projects?${qs}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "加载失败");
  }
  const data = await res.json();
  return { list: data.list as SkillSetRow[], total: data.total as number };
};

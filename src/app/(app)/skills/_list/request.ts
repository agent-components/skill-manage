"use client";

import type { ListPageRequest } from "listpage-components/ListPage";
import { authFetch } from "@/lib/auth-client";
import type { SkillFilter, SkillRow } from "./types";

export const requestSkills: ListPageRequest<SkillFilter> = async (
  pageParams,
  filterValues,
) => {
  const qs = new URLSearchParams();
  if (filterValues?.name) qs.set("name", filterValues.name);
  if (filterValues?.projectId) qs.set("projectId", filterValues.projectId);
  qs.set("page", String(pageParams.current || 1));
  qs.set("pageSize", String(pageParams.pageSize || 20));
  const res = await authFetch(`/api/skills?${qs}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "加载失败");
  }
  const data = await res.json();
  return { list: data.list as SkillRow[], total: data.total as number };
};

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
  qs.set("current", String(pageParams.current || 1));
  qs.set("pageSize", String(pageParams.pageSize || 20));
  const res = await authFetch(`/api/openapi/skill-sets?${qs}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "加载失败");
  }
  const data = await res.json();
  const list = (data.list ?? []) as SkillSetRow[];
  const ids = list.map((item) => item.id).filter(Boolean);
  if (ids.length > 0) {
    const iconRes = await authFetch(
      `/api/openapi/skill-sets/icons?ids=${encodeURIComponent(ids.join(","))}`,
    );
    if (iconRes.ok) {
      const icons = await iconRes.json().catch(() => ({ list: [] }));
      const byId = new Map(
        ((icons.list ?? []) as { id: string; icon: string | null }[]).map((item) => [
          item.id,
          item.icon,
        ]),
      );
      for (const row of list) row.icon = byId.get(row.id) ?? null;
    }
  }
  return { list, total: data.total as number };
};

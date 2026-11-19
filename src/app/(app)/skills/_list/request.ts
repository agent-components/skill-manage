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
  qs.set("current", String(pageParams.current || 1));
  qs.set("pageSize", String(pageParams.pageSize || 20));
  const raw = filterValues?.skillSetId;
  const skillSetIds = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
  const headers: Record<string, string> = {};
  if (skillSetIds.length) headers["x-skill-set-id"] = skillSetIds.join(",");
  const res = await authFetch(`/api/openapi/skills?${qs}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "加载失败");
  }
  const data = await res.json();
  const list = (data.list ?? []) as SkillRow[];
  const ids = list.map((item) => item.id).filter(Boolean);
  if (ids.length > 0) {
    const iconRes = await authFetch(
      `/api/openapi/skills/icons?ids=${encodeURIComponent(ids.join(","))}`,
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

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { Select, type SelectProps } from "antd";
import { useTRPC } from "@/lib/trpc";

export type SkillSetOption = { id: string; name: string; slug: string };

const SkillSetOptionsContext = createContext<SkillSetOption[]>([]);

export function SkillSetOptionsProvider({ children }: { children: ReactNode }) {
  const trpc = useTRPC();
  const { data } = useQuery(
    trpc.skillSet.list.queryOptions({ pageSize: 100 }),
  );

  const skillSets = useMemo<SkillSetOption[]>(
    () =>
      (data?.list ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
      })),
    [data],
  );

  return (
    <SkillSetOptionsContext.Provider value={skillSets}>
      {children}
    </SkillSetOptionsContext.Provider>
  );
}

export function SkillSetSelect({
  valueKey = "id",
  ...props
}: SelectProps & { valueKey?: "id" | "slug" }) {
  const skillSets = useContext(SkillSetOptionsContext);
  return (
    <Select
      allowClear
      optionFilterProp="label"
      {...props}
      options={skillSets.map((item) => ({
        value: item[valueKey],
        label: item.name,
      }))}
    />
  );
}

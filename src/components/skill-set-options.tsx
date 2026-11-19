"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Select, type SelectProps } from "antd";
import { authFetch } from "@/lib/auth-client";

export type SkillSetOption = { id: string; name: string };

const SkillSetOptionsContext = createContext<SkillSetOption[]>([]);

export function SkillSetOptionsProvider({ children }: { children: ReactNode }) {
  const [skillSets, setSkillSets] = useState<SkillSetOption[]>([]);

  useEffect(() => {
    let alive = true;
    authFetch("/api/openapi/skill-sets?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setSkillSets(
          (d.list || []).map((item: { id: string; name: string }) => ({
            id: item.id,
            name: item.name,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SkillSetOptionsContext.Provider value={skillSets}>
      {children}
    </SkillSetOptionsContext.Provider>
  );
}

export function SkillSetSelect(props: SelectProps) {
  const skillSets = useContext(SkillSetOptionsContext);
  return (
    <Select
      allowClear
      optionFilterProp="label"
      {...props}
      options={skillSets.map((item) => ({ value: item.id, label: item.name }))}
    />
  );
}

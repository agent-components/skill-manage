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

export type ProjectOption = { id: string; name: string };

const ProjectOptionsContext = createContext<ProjectOption[]>([]);

export function ProjectOptionsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  useEffect(() => {
    let alive = true;
    authFetch("/api/projects?pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setProjects(
          (d.list || []).map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          })),
        );
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  return (
    <ProjectOptionsContext.Provider value={projects}>
      {children}
    </ProjectOptionsContext.Provider>
  );
}

export function ProjectSelect(props: SelectProps) {
  const projects = useContext(ProjectOptionsContext);
  return (
    <Select
      allowClear
      optionFilterProp="label"
      {...props}
      options={projects.map((p) => ({ value: p.id, label: p.name }))}
    />
  );
}

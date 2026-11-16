"use client";

import type { FloatItem } from "listpage-components/ListPage";
import { CreateProjectFloat } from "./create-float";
import { DeleteProjectFloat } from "./delete-float";
import { EditProjectFloat } from "./edit-float";
import { ProjectSkillsFloat } from "./skills-float";
import type { ProjectRow } from "./types";

export const projectFloatKeys = {
  create: "create",
  edit: "edit",
  skills: "skills",
  delete: "delete",
} as const;

export const projectFloats: FloatItem<ProjectRow>[] = [
  {
    key: projectFloatKeys.create,
    render: (props) => <CreateProjectFloat {...props} />,
  },
  {
    key: projectFloatKeys.edit,
    render: (props) => <EditProjectFloat {...props} />,
  },
  {
    key: projectFloatKeys.skills,
    render: (props) => <ProjectSkillsFloat {...props} />,
  },
  {
    key: projectFloatKeys.delete,
    render: (props) => <DeleteProjectFloat {...props} />,
  },
];

"use client";

import type { FloatItem } from "listpage-components/ListPage";
import { CreateSkillSetFloat } from "./create-float";
import { DeleteSkillSetFloat } from "./delete-float";
import { EditSkillSetFloat } from "./edit-float";
import { SkillSetSkillsFloat } from "./skills-float";
import type { SkillSetRow } from "./types";

export const skillSetFloatKeys = {
  create: "create",
  edit: "edit",
  skills: "skills",
  delete: "delete",
} as const;

export const skillSetFloats: FloatItem<SkillSetRow>[] = [
  {
    key: skillSetFloatKeys.create,
    render: (props) => <CreateSkillSetFloat {...props} />,
  },
  {
    key: skillSetFloatKeys.edit,
    render: (props) => <EditSkillSetFloat {...props} />,
  },
  {
    key: skillSetFloatKeys.skills,
    render: (props) => <SkillSetSkillsFloat {...props} />,
  },
  {
    key: skillSetFloatKeys.delete,
    render: (props) => <DeleteSkillSetFloat {...props} />,
  },
];

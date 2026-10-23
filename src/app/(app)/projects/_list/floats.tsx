"use client";

import type { FloatItem } from "listpage-components/ListPage";
import { CreateProjectFloat } from "./create-float";
import type { ProjectRow } from "./types";

export const projectFloatKeys = {
  create: "create",
} as const;

export const projectFloats: FloatItem<ProjectRow>[] = [
  {
    key: projectFloatKeys.create,
    render: (props) => <CreateProjectFloat {...props} />,
  },
];

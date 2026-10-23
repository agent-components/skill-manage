"use client";

import { ListPage } from "listpage-components/ListPage";
import { projectFilter } from "./_list/filter";
import { projectFloats } from "./_list/floats";
import { requestProjects } from "./_list/request";
import { projectTable } from "./_list/table";
import type { ProjectFilter, ProjectRow } from "./_list/types";

export default function ProjectsPage() {
  return (
    <ListPage<ProjectRow, ProjectFilter>
      title="项目管理"
      filter={projectFilter}
      table={projectTable}
      request={requestProjects}
      float={{ floats: projectFloats }}
    />
  );
}

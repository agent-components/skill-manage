"use client";

import { ListPage } from "listpage-components/ListPage";
import { ProjectOptionsProvider } from "@/components/project-options";
import { skillFilter } from "./_list/filter";
import { skillFloats } from "./_list/floats";
import { requestSkills } from "./_list/request";
import { skillTable } from "./_list/table";
import type { SkillFilter, SkillRow } from "./_list/types";

export default function SkillsPage() {
  return (
    <ProjectOptionsProvider>
      <ListPage<SkillRow, SkillFilter>
        title="技能管理"
        filter={skillFilter}
        table={skillTable}
        request={requestSkills}
        float={{ floats: skillFloats }}
      />
    </ProjectOptionsProvider>
  );
}

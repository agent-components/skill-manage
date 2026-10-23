"use client";

import { ListPage } from "listpage-components/ListPage";
import { ProjectOptionsProvider } from "@/components/project-options";
import { tokenFilter } from "./_list/filter";
import { tokenFloats } from "./_list/floats";
import { requestTokens } from "./_list/request";
import { tokenTable } from "./_list/table";
import type { TokenFilter, TokenRow } from "./_list/types";

export default function TokensPage() {
  return (
    <ProjectOptionsProvider>
      <ListPage<TokenRow, TokenFilter>
        title="令牌管理"
        filter={tokenFilter}
        table={tokenTable}
        request={requestTokens}
        float={{ floats: tokenFloats }}
      />
    </ProjectOptionsProvider>
  );
}

"use client";

import type { FloatItem } from "listpage-components/ListPage";
import { CreateTokenFloat } from "./create-float";
import { EditTokenFloat } from "./edit-float";
import { RevokeTokenFloat } from "./revoke-float";
import type { TokenRow } from "./types";

export const tokenFloatKeys = {
  create: "create",
  edit: "edit",
  revoke: "revoke",
} as const;

export const tokenFloats: FloatItem<TokenRow>[] = [
  {
    key: tokenFloatKeys.create,
    render: (props) => <CreateTokenFloat {...props} />,
  },
  {
    key: tokenFloatKeys.edit,
    render: (props) => <EditTokenFloat {...props} />,
  },
  {
    key: tokenFloatKeys.revoke,
    render: (props) => <RevokeTokenFloat {...props} />,
  },
];

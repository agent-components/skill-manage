"use client";

import type { FloatItem } from "listpage-components/ListPage";
import { CreateTokenFloat } from "./create-float";
import { RevokeTokenFloat } from "./revoke-float";
import type { TokenRow } from "./types";

export const tokenFloatKeys = {
  create: "create",
  revoke: "revoke",
} as const;

export const tokenFloats: FloatItem<TokenRow>[] = [
  {
    key: tokenFloatKeys.create,
    render: (props) => <CreateTokenFloat {...props} />,
  },
  {
    key: tokenFloatKeys.revoke,
    render: (props) => <RevokeTokenFloat {...props} />,
  },
];
